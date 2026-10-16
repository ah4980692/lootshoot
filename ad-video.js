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
    .advid-note{font-size:13px;color:#7b8982;margin-bottom:10px;line-height:1.5}
    .advid-existing{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin-bottom:10px;border:1px solid #d8e7de;border-radius:10px;background:#eef9f2;font-size:13px;color:#123c2a}
    .advid-btn{border:1px solid #d8e7de;background:#fff;color:#0c4b32;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
    .advid-btn:hover{background:#eef9f2}
    .advid-btn.danger{color:#a83232}
    .advid-btn.small{padding:6px 10px;font-size:12px}
    .advid-pick{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .advid-file{font-size:13px;color:#123c2a;word-break:break-all}
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
      <div class="advid-note">Accounts only. Up to 3 minutes and 300 MB. It is shown after your photos and is reviewed with your ad.</div>

      <div class="advid-existing" hidden>
        <span class="advid-existing-text"></span>
        <button type="button" class="advid-btn danger small advid-remove-existing">Remove video</button>
      </div>

      <div class="advid-pick">
        <button type="button" class="advid-btn advid-choose">Choose video</button>
        <span class="advid-file"></span>
        <button type="button" class="advid-btn small advid-clear" hidden>Clear</button>
      </div>

      <input type="file" class="advid-input" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" hidden>

      <div class="advid-progress" hidden>
        <div class="advid-bar"><div class="advid-fill"></div></div>
        <div class="advid-status"></div>
      </div>

      <div class="advid-error" hidden></div>
    </div>
  `;

  const root = container.querySelector(".advid");
  const existingBox = container.querySelector(".advid-existing");
  const existingText = container.querySelector(".advid-existing-text");
  const removeExistingBtn = container.querySelector(".advid-remove-existing");
  const chooseBtn = container.querySelector(".advid-choose");
  const clearBtn = container.querySelector(".advid-clear");
  const fileLabel = container.querySelector(".advid-file");
  const input = container.querySelector(".advid-input");
  const progressBox = container.querySelector(".advid-progress");
  const fillBar = container.querySelector(".advid-fill");
  const statusText = container.querySelector(".advid-status");
  const errorBox = container.querySelector(".advid-error");

  let file = null;
  let visible = false;

  function setError(message) {
    errorBox.textContent = message || "";
    errorBox.hidden = !message;
  }

  function clearFile() {
    file = null;
    fileLabel.textContent = "";
    clearBtn.hidden = true;
    input.value = "";
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

  removeExistingBtn.addEventListener("click", () => {
    if (options.onRemoveExisting) options.onRemoveExisting();
  });

  input.addEventListener("change", async () => {
    const picked = input.files && input.files[0];
    input.value = "";

    if (!picked) return;

    setError("");
    fileLabel.textContent = "Checking video...";
    clearBtn.hidden = true;

    const problem = await adVideoValidateFile(picked);

    if (problem) {
      clearFile();
      setError(problem);
      return;
    }

    file = picked;
    fileLabel.textContent = `${picked.name} (${adVideoFormatSize(picked.size)})`;
    clearBtn.hidden = false;
  });

  return {
    // Show the box only for account ads
    show(isVisible) {
      visible = !!isVisible;
      root.hidden = !visible;

      if (!visible) {
        clearFile();
        setError("");
        hideProgress();
      }
    },

    getFile() {
      return visible ? file : null;
    },

    // info = { video_id, video_status } or null (used on the edit page)
    setExisting(info) {
      if (!info || !info.video_id) {
        existingBox.hidden = true;
        return;
      }

      existingBox.hidden = false;

      if (info.video_status === "ready") {
        existingText.textContent = "A video is added to this ad.";
        removeExistingBtn.hidden = false;
      } else if (info.video_status === "processing") {
        existingText.textContent = "Your video is being processed.";
        removeExistingBtn.hidden = false;
      } else {
        existingText.textContent = "An earlier upload did not finish. Please choose the video again.";
        removeExistingBtn.hidden = true;
      }
    },

    setProgress(percent, text) {
      progressBox.hidden = false;
      fillBar.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
      statusText.textContent = text || `Uploading video ${percent || 0}%`;
    },

    hideProgress,
    setError,

    reset() {
      clearFile();
      setError("");
      hideProgress();
    }
  };
}
