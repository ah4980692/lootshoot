// ============================================
// TOAST
// ============================================
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Show an inline error message inside the forgot-password modal
function setForgotError(text) {
  const emailStep = document.querySelector('.reset-step[data-step="email"]');
  if (!emailStep) return;
  let el = emailStep.querySelector('.form-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    el.style.color = '#e74c3c';
    el.style.marginTop = '8px';
    emailStep.appendChild(el);
  }
  el.textContent = text || '';
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
// CHECKOUT MODAL (package selection)
// ============================================
const checkoutModal = document.getElementById('checkoutModal');
const closeModal = document.getElementById('closeModal');
const modalPackage = document.getElementById('modalPackage');
const modalAmount = document.getElementById('modalAmount');
const modalPrice = document.getElementById('modalPrice');
const checkoutForm = document.getElementById('checkoutForm');
const quantityDisplay = document.getElementById('quantity');
const minusButton = document.getElementById('minus');
const plusButton = document.getElementById('plus');

let basePrice = 499;
let quantity = 1;

function updatePrice() {
  quantityDisplay.textContent = quantity;
  modalPrice.textContent = `₹${basePrice * quantity}`;
}

document.querySelectorAll('.package-button').forEach((button) => {
  button.addEventListener('click', () => {
    modalPackage.textContent = button.getAttribute('data-package');
    modalAmount.textContent = button.getAttribute('data-amount');
    basePrice = parseInt(button.getAttribute('data-price'), 10);
    quantity = 1;
    updatePrice();
    checkoutModal.classList.add('open');
  });
});

closeModal.addEventListener('click', () => {
  checkoutModal.classList.remove('open');
});

// Close when clicking the dark backdrop (outside the white card)
checkoutModal.addEventListener('click', (e) => {
  if (e.target === checkoutModal) {
    checkoutModal.classList.remove('open');
  }
});

minusButton.addEventListener('click', () => {
  if (quantity > 1) {
    quantity -= 1;
    updatePrice();
  }
});

plusButton.addEventListener('click', () => {
  quantity += 1;
  updatePrice();
});

checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('This is a demo checkout — connect Stripe to accept live payments.');
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
const otpCodeInput = document.getElementById('otpCode');
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

// Clear inline error when user edits the email field
if (forgotEmailInput) {
  forgotEmailInput.addEventListener('input', () => {
    setForgotError('');
  });
}

// ============================================
// REAL FORGOT PASSWORD OTP FLOW
// ============================================

if (sendOtpButton) {
  sendOtpButton.addEventListener('click', async () => {
    // Clear any previous inline error
    setForgotError('');

    const email = forgotEmailInput.value.trim();

    if (!email) {
      setForgotError('Please enter your email address.');
      showToast('Please enter your email address.');
      return;
    }

    showToast('Checking account...');

    try {

      // Check whether the email exists in LootShoot
      if (!window.supabaseAuth || !window.supabaseAuth.supabaseClient) {
        console.error('supabaseAuth not initialized');
        showToast('Auth not initialized. Please reload the page.');
        return;
      }

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
        showToast('Could not check account. Please try again.');
        return;
      }

      // Support multiple shapes returned by the function: { exists: true },
      // { body: { exists: true } } or other variants. Be defensive.
      let exists = false;

      if (checkData && typeof checkData === 'object') {
        if ('exists' in checkData) exists = !!checkData.exists;
        else if ('body' in checkData && checkData.body && 'exists' in checkData.body)
          exists = !!checkData.body.exists;
        else if ('data' in checkData && checkData.data && 'exists' in checkData.data)
          exists = !!checkData.data.exists;
      } else {
        // Fallback: truthy checkData treated as exists
        exists = !!checkData;
      }

      // Email is not registered
      if (!exists) {
        setForgotError('No account found for that email.');
        showToast('Account not found. Please check your email.');
        return;
      }

      // Email exists, so send the recovery OTP
      showToast('Sending OTP...');

      const { error } =
        await window.supabaseAuth.supabaseClient.auth
          .resetPasswordForEmail(email);

      if (error) {
        console.error('Password reset error:', error);
        showToast('Error: ' + error.message);
        return;
      }

      resetEmailDisplay.textContent = email;

      showResetStep('otp');

      otpCodeInput.value = '';

      showToast('OTP sent to your email.');

    } catch (err) {

      console.error('Password reset error:', err);

      showToast(
        'Error: ' + (err?.message || 'Could not send OTP.')
      );

    }

  });
}

if (verifyOtpButton) {
  verifyOtpButton.addEventListener('click', async () => {

    const email = forgotEmailInput.value.trim();
    const code = otpCodeInput.value.trim();

    if (!code) {
      showToast('Please enter the OTP code.');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      showToast('Please enter a valid 6-digit OTP.');
      return;
    }

    showToast('Verifying OTP...');

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

        showToast('Invalid or expired OTP.');

        return;
      }

      showResetStep('new-password');

      showToast('OTP verified successfully.');

    } catch (err) {

      console.error('OTP verification error:', err);

      showToast(
        'Verification failed: ' +
        (err?.message || 'Please try again.')
      );

    }

  });
}

if (resetPasswordButton) {
  resetPasswordButton.addEventListener('click', async () => {

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    if (!newPassword || !confirmPassword) {
      showToast('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

    showToast('Updating password...');

    try {

      const { data, error } =
        await window.supabaseAuth.supabaseClient.auth
          .updateUser({
            password: newPassword
          });

      console.log('Password update result:', {
        data,
        error
      });

      if (error) {
        console.error('Password update error:', error);

        showToast('Could not update password: ' + error.message);

        return;
      }

      showToast('Password updated successfully!');

      setTimeout(() => {

        forgotPasswordModal.classList.remove('open');

        forgotEmailInput.value = '';
        otpCodeInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';

        showResetStep('email');

      }, 1200);

    } catch (err) {

      console.error('Password update error:', err);

      showToast(
        'Password update failed: ' +
        (err?.message || 'Please try again.')
      );

    }

  });
                                   }
