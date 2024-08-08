import { submit_form_template, notify_user } from './formauth.js';


(() => {
    const otp_wrapper = document.querySelector(".otp-wrapper");
    const otp_input = otp_wrapper.querySelector(".otp-input");
    const otp_form_button = otp_wrapper.querySelector(".otp-form-button");
    const otp_resend_button = otp_form_button.querySelector(".resend");


    otp_input.onkeyup = (e) => {
        const value = e.target.value;
        const regex = /^\d+$/;
        if (value.match(regex)) {
            if (value.length < 5) { notify_user("__. Validating input") }
            else {
                if (value.match("[0-9]{4}") && value.length == 5) { notify_user("OTP input validated! Proceed ") }
                else { 
                    notify_user("Error. OTP exceeds required length"); 
                    setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000);
                }
            }
        }
        else if (value.length == 0) { 
            notify_user("Error. Provide OTP codes !");
            setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000); 
        }
        else { 
            notify_user("Error. OTP requires only numbers!");
            setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000);
        }
    }
    otp_resend_button.onclick = (e) => { submit_form_template(`${e.target.dataset.url}`, ""); };
})();