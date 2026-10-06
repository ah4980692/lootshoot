// ============================================
// TOAST
// Works with either CSS class name ("show" or "visible")
// ============================================
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show', 'visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show', 'visible');
  }, 3000);
}

// ============================================
// INLINE ERRORS + BUTTON LOADING HELPERS
// ============================================

// Show an inline error inside a given step of the forgot-password modal
function setResetError(stepName, text) {
  const step = document.querySelector(`.reset-step[data-step="${stepName}"]`);
  if (!step) return;
  let el = step.querySelector('.form-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    el.style.color = '#e74c3c';
    el.style.marginTop = '8px';
    step.appendChild(el);
  }
  el.textContent = text || '';
}

function setForgotError(text) {
  setResetError('email', text);
}

// Disables a button while an async action runs (prevents double submit)
async function runWithButton(button, busyText, action) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  try {
    await action();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// ============================================
// SMOOTH SCROLL (Browse packages)
// ============================================
document.querySelectorAll('[data-scroll]').forEach((el) => {
  el.addEventListener('click', () => {
    const target = document.querySelector(el.getAttribute('data-scroll'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ============================================
// FAQ ACCORDION
// ============================================
document.querySelectorAll('.faq-question').forEach((question) => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    const isOpen = question.classList.contains('open');

    // Close any other open question first
    document.querySelectorAll('.faq-question.open').forEach((openQuestion) => {
      if (openQuestion !== question) {
        openQuestion.classList.remove('open');
        openQuestion.nextElementSibling.classList.remove('open');
      }
    });

    question.classList.toggle('open', !isOpen);
    answer.classList.toggle('open', !isOpen);
  });
});

// ============================================
// CONTACT US → WHATSAPP
// ============================================
const supportButton = document.getElementById('supportButton');

if (supportButton) {
  supportButton.addEventListener('click', () => {
    // TODO: replace with your real WhatsApp number in international
    // format, digits only, no + or spaces (e.g. 919876543210)
    const phoneNumber = '923411444759';
    const message = encodeURIComponent('Hi, I have a question about LootShoot.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  });
}

// ============================================
// EXPLORE MARKETPLACE
// ============================================
const browseButton = document.getElementById('browseButton');

if (browseButton) {
  browseButton.addEventListener('click', () => {
    window.location.href = 'seller-dashboard.html';
  });
}

// ============================================
// SIGN IN
// Simple sign-in modal — open/close
// ============================================
const signInButton = document.getElementById('signInButton');
const signInModal = document.getElementById('signInModal');
const closeSignInModal = document.getElementById('closeSignInModal');
const signInForm = document.getElementById('signInForm');
const openSellerFromSignIn = document.getElementById('openSellerFromSignIn');

if (signInButton) {
  signInButton.addEventListener('click', () => {
    if (signInModal) signInModal.classList.add('open');
  });
}

if (closeSignInModal) {
  closeSignInModal.addEventListener('click', () => {
    if (signInModal) signInModal.classList.remove('open');
  });
}

if (signInModal) {
  signInModal.addEventListener('click', (e) => {
    if (e.target === signInModal) {
      signInModal.classList.remove('open');
    }
  });
}

if (openSellerFromSignIn) {
  openSellerFromSignIn.addEventListener('click', (e) => {
    e.preventDefault();
    if (signInModal) signInModal.classList.remove('open');
    if (sellerModal) sellerModal.classList.add('open');
  });
}

// ============================================
// BECOME A SELLER
// ============================================
const sellerButton = document.getElementById('sellerButton');
const sellerModal = document.getElementById('sellerModal');
const closeSellerModal = document.getElementById('closeSellerModal');
const sellerForm = document.getElementById('sellerForm');

if (sellerButton) {
  sellerButton.addEventListener('click', () => {
    sellerModal.classList.add('open');
  });
}

if (closeSellerModal) {
  closeSellerModal.addEventListener('click', () => {
    sellerModal.classList.remove('open');
  });
}

if (sellerModal) {
  sellerModal.addEventListener('click', (e) => {
    if (e.target === sellerModal) {
      sellerModal.classList.remove('open');
    }
  });
}

// ============================================
// FORGOT PASSWORD FLOW
// ============================================
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
const forgotEmailInput = document.getElementById('forgotEmail');
const sendOtpButton = document.getElementById('sendOtpButton');
const verifyOtpButton = document.getElementById('verifyOtpButton');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const resetPasswordButton = document.getElementById('resetPasswordButton');
const resetEmailDisplay = document.getElementById('resetEmailDisplay');
const resetSteps = document.querySelectorAll('.reset-step');

function showResetStep(stepName) {
  resetSteps.forEach((step) => {
    const matches = step.dataset.step === stepName;
    step.classList.toggle('hidden', !matches);
  });

  // Focus the first OTP box when the OTP step opens
  if (stepName === 'otp' && resetOtpBoxes.length) {
    setTimeout(() => resetOtpBoxes[0].focus(), 50);
  }
}

const forgotPasswordLink = document.querySelector('.forgot-password');

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (signInModal) signInModal.classList.remove('open');
    if (forgotPasswordModal) forgotPasswordModal.classList.add('open');
    showResetStep('email');
  });
}

if (closeForgotPasswordModal) {
  closeForgotPasswordModal.addEventListener('click', () => {
    if (forgotPasswordModal) forgotPasswordModal.classList.remove('open');
  });
}

if (forgotPasswordModal) {
  forgotPasswordModal.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.classList.remove('open');
    }
  });
}

// ============================================
// FORGOT PASSWORD: 6-BOX OTP INPUT
// Each box holds exactly 1 digit. Pasting (or mobile autofill)
// spreads the digits across the boxes.
// ============================================
const resetOtpBoxes = Array.from(document.querySelectorAll('.reset-otp-input'));

function getResetOtp() {
  return resetOtpBoxes.map((box) => box.value).join('');
}

function clearResetOtp() {
  resetOtpBoxes.forEach((box) => { box.value = ''; });
}

function fillResetOtpFrom(start, digits) {
  digits.split('').forEach((d, k) => {
    if (resetOtpBoxes[start + k]) resetOtpBoxes[start + k].value = d;
  });
  resetOtpBoxes[Math.min(start + digits.length, resetOtpBoxes.length - 1)].focus();
}

resetOtpBoxes.forEach((box, index) => {

  box.addEventListener('input', () => {
    setResetError('otp', '');

    const digits = box.value.replace(/\D/g, '');

    // Autofill or fast typing can put several digits in one box
    if (digits.length > 1) {
      box.value = '';
      const start = digits.length >= resetOtpBoxes.length ? 0 : index;
      fillResetOtpFrom(start, digits.slice(0, resetOtpBoxes.length - start));
      return;
    }

    box.value = digits;

    if (digits && index < resetOtpBoxes.length - 1) {
      resetOtpBoxes[index + 1].focus();
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && index > 0) {
      resetOtpBoxes[index - 1].focus();
    }
  });

  box.addEventListener('paste', (e) => {
    e.preventDefault();

    const digits = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/\D/g, '');

    if (!digits) return;

    // A full code always fills from the first box
    const start = digits.length >= resetOtpBoxes.length ? 0 : index;

    fillResetOtpFrom(start, digits.slice(0, resetOtpBoxes.length - start));
    setResetError('otp', '');
  });
});

// Clear inline errors when the user edits a field
if (forgotEmailInput) {
  forgotEmailInput.addEventListener('input', () => setResetError('email', ''));
}
if (newPasswordInput) {
  newPasswordInput.addEventListener('input', () => setResetError('new-password', ''));
}
if (confirmNewPasswordInput) {
  confirmNewPasswordInput.addEventListener('input', () => setResetError('new-password', ''));
}

// ============================================
// REAL FORGOT PASSWORD OTP FLOW
// Errors are shown inline only; toasts are used for success messages.
// ============================================

if (sendOtpButton) {
  sendOtpButton.addEventListener('click', () =>
    runWithButton(sendOtpButton, 'Sending...', async () => {

      setResetError('email', '');

      const email = forgotEmailInput.value.trim();

      if (!email) {
        setResetError('email', 'Please enter your email address.');
        return;
      }

      try {

        if (!window.supabaseAuth || !window.supabaseAuth.supabaseClient) {
          console.error('supabaseAuth not initialized');
          setResetError('email', 'Auth not initialized. Please reload the page.');
          return;
        }

        // Check whether the email exists in LootShoot
        const { data: checkData, error: checkError } =
          await window.supabaseAuth.supabaseClient.functions.invoke(
            'check-reset-email',
            {
              body: { email }
            }
          );

        console.log('check-reset-email result', { checkData, checkError });

        if (checkError) {
          console.error('Email check error:', checkError);
          setResetError('email', 'Could not check account. Please try again.');
          return;
        }

        // Support multiple shapes returned by the function
        let exists = false;

        if (checkData && typeof checkData === 'object') {
          if ('exists' in checkData) exists = !!checkData.exists;
          else if ('body' in checkData && checkData.body && 'exists' in checkData.body)
            exists = !!checkData.body.exists;
          else if ('data' in checkData && checkData.data && 'exists' in checkData.data)
            exists = !!checkData.data.exists;
        } else {
          exists = !!checkData;
        }

        // Email is not registered
        if (!exists) {
          setResetError('email', 'No account found for that email.');
          return;
        }

        // Email exists, so send the recovery OTP
        const { error } =
          await window.supabaseAuth.supabaseClient.auth
            .resetPasswordForEmail(email);

        if (error) {
          console.error('Password reset error:', error);
          setResetError('email', error.message);
          return;
        }

        resetEmailDisplay.textContent = email;

        clearResetOtp();
        setResetError('otp', '');
        showResetStep('otp');

        showToast('OTP sent to your email.');

      } catch (err) {

        console.error('Password reset error:', err);

        setResetError('email', err?.message || 'Could not send OTP.');

      }
    })
  );
}

if (verifyOtpButton) {
  verifyOtpButton.addEventListener('click', () =>
    runWithButton(verifyOtpButton, 'Verifying...', async () => {

      setResetError('otp', '');

      const email = forgotEmailInput.value.trim();
      const code = getResetOtp();

      if (!code) {
        setResetError('otp', 'Please enter the OTP code.');
        return;
      }

      if (!/^\d{6}$/.test(code)) {
        setResetError('otp', 'Please enter all 6 digits.');
        return;
      }

      try {

        const { data, error } =
          await window.supabaseAuth.supabaseClient.auth
            .verifyOtp({
              email: email,
              token: code,
              type: 'recovery'
            });

        console.log('Recovery OTP result:', {
          data,
          error
        });

        if (error) {
          console.error('OTP verification error:', error);
          setResetError('otp', 'Invalid or expired OTP.');
          return;
        }

        showResetStep('new-password');

        showToast('OTP verified successfully.');

      } catch (err) {

        console.error('OTP verification error:', err);

        setResetError('otp', err?.message || 'Verification failed. Please try again.');

      }
    })
  );
}

if (resetPasswordButton) {
  resetPasswordButton.addEventListener('click', () =>
    runWithButton(resetPasswordButton, 'Updating...', async () => {

      setResetError('new-password', '');

      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmNewPasswordInput.value;

      if (!newPassword || !confirmPassword) {
        setResetError('new-password', 'Please enter and confirm your new password.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setResetError('new-password', 'Passwords do not match.');
        return;
      }

      if (newPassword.length < 6) {
        setResetError('new-password', 'Password must be at least 6 characters.');
        return;
      }

      try {

        const supabaseClient = window.supabaseAuth.supabaseClient;

        const { data, error } =
          await supabaseClient.auth.updateUser({
            password: newPassword
          });

        console.log('Password update result:', {
          data,
          error
        });

        if (error) {
          console.error('Password update error:', error);
          setResetError('new-password', 'Could not update password: ' + error.message);
          return;
        }

        // Sign the user out so they log in fresh with the new password
        await supabaseClient.auth.signOut();

        localStorage.removeItem('sellerAuthSession');
        localStorage.removeItem('sellerSessionUserId');
        sessionStorage.removeItem('sellerAuthSession');
        sessionStorage.removeItem('sellerSessionUserId');

        showToast('Password updated! Please sign in with your new password.');

        setTimeout(() => {

          forgotPasswordModal.classList.remove('open');

          forgotEmailInput.value = '';
          clearResetOtp();
          newPasswordInput.value = '';
          confirmNewPasswordInput.value = '';

          showResetStep('email');

          // Open the sign-in modal so they can log in right away
          if (signInModal) signInModal.classList.add('open');

        }, 1200);

      } catch (err) {

        console.error('Password update error:', err);

        setResetError('new-password', 'Password update failed: ' + (err?.message || 'Please try again.'));

      }
    })
  );
}
