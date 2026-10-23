/* =========================================================
   ad-video.js
   Shared helpers for ad videos (Bunny Stream).
   Needs: tus-js-client (window.tus) and a Supabase client.
   The Bunny API key is never used here: the Supabase
   function "bunny-video" signs every upload.
========================================================= */

const AD_VIDEO_MAX_SECONDS = 180;              // 3 minutes
const AD_VIDEO_MAX_BYTES = 300 * 1024 * 1024;  // 300 MB
const AD_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// Public Bunny address used for video thumbnails (same value as on the ad page)
const AD_VIDEO_CDN_HOSTNAME = "vz-62dd5ed1-61d.b-cdn.net";

function adVideoIsAccountType(type) {
  const t = String(type || "").trim().toLowerCase();
  return t === "account" || t === "accounts";
}

function adVideoSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adVideoFormatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Gets the readable message out of a failed function call
async function adVideoErrorMessage(error, data) {
  if (data && data.error) return data.error;

  try {
    if (error && error.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body && body.error) return body.error;
    }
  } catch (e) {
    // ignore and use the fallback below
  }

  return (error && error.message) || "Something went wrong. Please try again.";
}

// Reads the length of a video file in the browser (NaN if the browser can't)
function adVideoReadDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let finished = false;

    const finish = (value) => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(value);
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => finish(Number(video.duration));
    video.onerror = () => finish(NaN);
    setTimeout(() => finish(NaN), 8000);
    video.src = url;
  });
}

// Returns an error message, or null when the file is fine.
// (This is quick feedback only: the server checks the length again.)
async function adVideoValidateFile(file) {
  if (!file) return "No file selected.";

  const looksLikeVideo =
    AD_VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|m4v|webm)$/i.test(file.name || "");

  if (!looksLikeVideo) return "Please choose an MP4, MOV or WEBM video.";

  if (file.size > AD_VIDEO_MAX_BYTES) return "The video must be 300 MB or smaller.";

  const seconds = await adVideoReadDuration(file);

  if (Number.isFinite(seconds) && seconds > AD_VIDEO_MAX_SECONDS) {
    return "The video is longer than 3 minutes. Please choose a shorter one.";
  }

  return null;
}

// Asks the server to check the uploaded video.
async function adVideoCheck(client, adId) {
  try {
    const { data, error } = await client.functions.invoke("bunny-video", {
      body: { action: "finish", ad_id: adId }
    });

    // The server rejected the video (for example: too long)
    if (data && data.ok === false) {
      return { ok: false, final: true, error: data.error || "The video was rejected." };
    }

    if (error || !data) {
      return { ok: false, final: false, error: await adVideoErrorMessage(error, data) };
    }

    return { ok: true, status: data.status || "processing" };
  } catch (err) {
    return { ok: false, final: false, error: "Could not check the video." };
  }
}

async function adVideoRemove(client, adId) {
  try {
    const { data, error } = await client.functions.invoke("bunny-video", {
      body: { action: "remove", ad_id: adId }
    });

    if (error || !data || data.ok !== true) {
      return { ok: false, error: await adVideoErrorMessage(error, data) };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Could not remove the video." };
  }
}

// Uploads one video to an ad. Never throws: always returns { ok, status, error }.
// onProgress(percent, text) is called while uploading.
async function adVideoUpload(client, adId, file, onProgress) {
  try {
    if (!window.tus) {
      return { ok: false, error: "The video uploader could not load. Please refresh the page and try again." };
    }

    const problem = await adVideoValidateFile(file);
    if (problem) return { ok: false, error: problem };

    // 1. Ask the server for permission and a signed ticket
    const { data: ticket, error: startError } = await client.functions.invoke("bunny-video", {
      body: { action: "start", ad_id: adId }
    });

    if (startError || !ticket || ticket.ok !== true) {
      return { ok: false, error: await adVideoErrorMessage(startError, ticket) };
    }

    // 2. Send the video straight to Bunny
    await new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: ticket.signature,
          AuthorizationExpire: String(ticket.expire),
          VideoId: ticket.videoId,
          LibraryId: String(ticket.libraryId)
        },
        metadata: {
          filetype: file.type || "video/mp4",
          title: file.name || "video"
        },
        onError: reject,
        onProgress: (sent, total) => {
          if (onProgress) onProgress(Math.round((sent / total) * 100));
        },
        onSuccess: resolve
      });

      upload.start();
    });

    // 3. Let the server check the length and mark the video ready
    if (onProgress) onProgress(100, "Checking video...");

    for (let attempt = 0; attempt < 12; attempt++) {
      const result = await adVideoCheck(client, adId);

      if (result.ok && result.status === "ready") {
        return { ok: true, status: "ready" };
      }

      if (!result.ok && result.final) {
        return { ok: false, error: result.error };
      }

      await adVideoSleep(5000);
    }

    // Bunny is still reading the file; it will show up once processed
    return { ok: true, status: "processing" };

  } catch (err) {
    console.error("Video upload error:", err);
    return {
      ok: false,
      error: "The upload was interrupted. Please check your connection and try again."
    };
  }
}


/* =========================================================
   The "Choose video" box shown inside the ad forms
   (works like the photo boxes: the video fills the box as a
   preview, with a cross at the top right to remove it)

   On the Edit page, a video the ad already has is shown in the
   same kind of box. Pressing its cross does NOT remove anything
   right away: it only marks the video for removal. The page
   removes it when the seller presses Save (see isRemovingExisting).
========================================================= */

function adVideoInjectStyles() {
  if (document.getElementById("adVideoStyles")) return;

  const style = document.createElement("style");
  style.id = "adVideoStyles";
  style.textContent = `
    .advid{margin-bottom:20px;font-family:inherit}
    .advid [hidden]{display:none !important}
    .advid-title{font-weight:700;font-size:14px;margin-bottom:6px;color:#123c2a}
    .advid-title span{font-weight:500;color:#718078}
    .advid-note{font-size:13px;color:#7b8982;margin-top:7px;line-height:1.5}

    /* Same grid as the photo boxes, so the video box is the same size */
    .advid-grid{
      display:grid;
      grid-template-columns:repeat(3, minmax(0, 1fr));
      gap:10px;
      margin-top:4px;
    }

    /* Empty "+ Video" box */
    .advid-choose{
      aspect-ratio:1 / 1;
      width:100%;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:4px;
      border:1px dashed #d8e7de;
      border-radius:10px;
      background:#eef9f2;
      color:#718078;
      font-size:0.68rem;
      font-weight:700;
      padding:0;
      line-height:1.2;
      cursor:pointer;
      font-family:inherit;
    }
    .advid-choose:hover{background:#eef9f2}
    .advid-choose-icon{
      font-size:1.3rem;
      line-height:1;
      color:#25a56a;
    }

    /* Filled box (new video preview, or the video the ad already has) */
    .advid-thumb{
      position:relative;
      aspect-ratio:1 / 1;
      border-radius:10px;
      overflow:hidden;
      border:1px solid #d8e7de;
      background:#0c1f17;
    }
    .advid-preview{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
      pointer-events:none;
    }
    .advid-play{
      position:absolute;
      left:50%;
      top:50%;
      transform:translate(-50%, -50%);
      width:30px;
      height:30px;
      border-radius:50%;
      background:rgba(0,0,0,0.55);
      color:#fff;
      font-size:0.75rem;
      display:flex;
      align-items:center;
      justify-content:center;
      padding-left:2px;
      pointer-events:none;
    }
    .advid-label{
      position:absolute;
      left:0;
      right:0;
      bottom:0;
      padding:3px 4px;
      background:rgba(0,0,0,0.6);
      color:#fff;
      font-size:0.62rem;
      font-weight:700;
      text-align:center;
      line-height:1.2;
      pointer-events:none;
    }
    .advid-clear{
      position:absolute;
      top:4px;
      right:4px;
      width:22px;
      height:22px;
      border:none;
      border-radius:50%;
      background:rgba(0,0,0,0.55);
      color:#fff;
      font-size:0.8rem;
      cursor:pointer;
      padding:0;
      line-height:1;
    }

    .advid-progress{margin-top:12px}
    .advid-bar{height:8px;border-radius:999px;background:#e7eee9;overflow:hidden}
    .advid-fill{height:100%;width:0;background:#25a56a;transition:width .2s}
    .advid-status{font-size:13px;color:#718078;margin-top:6px}
    .advid-error{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f8e5e5;color:#a83232;font-size:13px;line-height:1.5}
  `;

  document.head.appendChild(style);
}

function createAdVideoPicker(container, options) {
  options = options || {};

  adVideoInjectStyles();

  container.innerHTML = `
    <div class="advid" hidden>
      <div class="advid-title">Video <span>(optional)</span></div>

      <div class="advid-grid">
        <button type="button" class="advid-choose" aria-label="Choose video">
          <span class="advid-choose-icon">+</span>
          <span class="advid-choose-label">Add video</span>
        </button>

        <!-- A new video the seller picked -->
        <div class="advid-thumb advid-new-thumb" hidden>
          <video class="advid-preview" muted playsinline preload="metadata"></video>
          <span class="advid-play" aria-hidden="true">▶</span>
          <button type="button" class="advid-clear" aria-label="Remove video">×</button>
        </div>

        <!-- The video the ad already has (Edit page) -->
        <div class="advid-thumb advid-existing-thumb" hidden>
          <img class="advid-preview advid-existing-img" alt="">
          <span class="advid-play" aria-hidden="true">▶</span>
          <span class="advid-label advid-existing-label" hidden></span>
          <button type="button" class="advid-clear advid-existing-clear" aria-label="Remove video">×</button>
        </div>
      </div>

      <div class="advid-note">Up to 3 minutes.</div>

      <input type="file" class="advid-input" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" hidden>

      <div class="advid-progress" hidden>
        <div class="advid-bar"><div class="advid-fill"></div></div>
        <div class="advid-status"></div>
      </div>

      <div class="advid-error" hidden></div>
    </div>
  `;

  const root = container.querySelector(".advid");
  const chooseBtn = container.querySelector(".advid-choose");
  const chooseLabel = container.querySelector(".advid-choose-label");
  const thumb = container.querySelector(".advid-new-thumb");
  const preview = container.querySelector(".advid-preview");
  const clearBtn = container.querySelector(".advid-new-thumb .advid-clear");
  const existingThumb = container.querySelector(".advid-existing-thumb");
  const existingImg = container.querySelector(".advid-existing-img");
  const existingLabel = container.querySelector(".advid-existing-label");
  const existingClearBtn = container.querySelector(".advid-existing-clear");
  const input = container.querySelector(".advid-input");
  const progressBox = container.querySelector(".advid-progress");
  const fillBar = container.querySelector(".advid-fill");
  const statusText = container.querySelector(".advid-status");
  const errorBox = container.querySelector(".advid-error");

  const DEFAULT_CHOOSE_LABEL = "Add video";

  let file = null;
  let visible = false;
  let previewUrl = "";

  // The video the ad already has, and whether the seller pressed its cross
  let existing = null;
  let removed = false;

  // Shows the right box: existing video, new video, or the empty "Add video" box
  function render() {
    const keepExisting = !!existing && !removed;

    existingThumb.hidden = !keepExisting;
    chooseBtn.hidden = keepExisting || !!file;
    thumb.hidden = keepExisting || !file;
  }

  function setError(message) {
    errorBox.textContent = message || "";
    errorBox.hidden = !message;
  }

  function releasePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }

    preview.removeAttribute("src");
    preview.load();
  }

  function showEmptyBox() {
    chooseBtn.disabled = false;
    chooseLabel.textContent = DEFAULT_CHOOSE_LABEL;
    render();
  }

  function showFilledBox(pickedFile) {
    releasePreview();

    previewUrl = URL.createObjectURL(pickedFile);
    // #t=0.1 makes the browser show a frame instead of a black box
    preview.src = previewUrl + "#t=0.1";

    thumb.title = `${pickedFile.name} (${adVideoFormatSize(pickedFile.size)})`;
    render();
  }

  function clearFile() {
    file = null;
    input.value = "";
    releasePreview();
    showEmptyBox();
  }

  function hideProgress() {
    progressBox.hidden = true;
    fillBar.style.width = "0";
    statusText.textContent = "";
  }

  chooseBtn.addEventListener("click", () => input.click());

  clearBtn.addEventListener("click", () => {
    clearFile();
    setError("");
  });

  // Cross on the video the ad already has: only marks it for removal.
  // Nothing is removed until the seller presses Save.
  existingClearBtn.addEventListener("click", () => {
    removed = true;
    setError("");
    render();
  });

  input.addEventListener("change", async () => {
    const picked = input.files && input.files[0];
    input.value = "";

    if (!picked) return;

    setError("");
    chooseBtn.disabled = true;
    chooseLabel.textContent = "Checking...";

    const problem = await adVideoValidateFile(picked);

    if (problem) {
      clearFile();
      setError(problem);
      return;
    }

    file = picked;
    showFilledBox(picked);
  });

  render();

  return {
    // Show the box only for account ads
    show(isVisible) {
      visible = !!isVisible;
      root.hidden = !visible;

      if (!visible) {
        removed = false;
        clearFile();
        setError("");
        hideProgress();
      }
    },

    getFile() {
      return visible ? file : null;
    },

    // True when the ad has a video and the seller pressed its cross
    // (the page should remove the video when saving)
    isRemovingExisting() {
      return visible && !!existing && removed;
    },

    // info = { video_id, video_status } or null (used on the edit page)
    setExisting(info) {
      removed = false;

      if (!info || !info.video_id) {
        existing = null;
        existingImg.removeAttribute("src");
        render();
        return;
      }

      existing = info;

      // The thumbnail may not exist yet right after an upload: keep the dark box
      existingImg.style.display = "";
      existingImg.onerror = () => { existingImg.style.display = "none"; };
      existingImg.src = `https://${AD_VIDEO_CDN_HOSTNAME}/${info.video_id}/thumbnail.jpg`;

      if (info.video_status === "processing") {
        existingLabel.textContent = "Processing";
        existingLabel.hidden = false;
      } else if (info.video_status === "ready") {
        existingLabel.hidden = true;
      } else {
        existingLabel.textContent = "Not finished";
        existingLabel.hidden = false;
      }

      render();
    },

    setProgress(percent, text) {
      progressBox.hidden = false;
      fillBar.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
      statusText.textContent = text || `Uploading video ${percent || 0}%`;
    },

    hideProgress,
    setError,

    reset() {
      removed = false;
      clearFile();
      setError("");
      hideProgress();
    }
  };
}
