(() => {
    const otp_wrapper = document.querySelector(".otp-wrapper");
    const otp_input = otp_wrapper.querySelector(".otp-input");
    const otp_form_button = otp_wrapper.querySelector(".otp-form-button");
    const alert_wrapper = otp_wrapper.querySelector(".form-alert-wrapper");
    const alert_text = alert_wrapper.querySelector(".alert-text");

    const alert_sucess = (msg) => {
        alert_text.innerHTML = msg;
        alert_wrapper.classList.add("sucess");
        alert_wrapper.classList.remove("fail");
        otp_form_button.classList.add("activate");
        alert_wrapper.classList.add("transit");
    };
    const alert_fail = (msg) => {
        alert_text.innerHTML = msg;
        alert_wrapper.classList.add("fail");
        alert_wrapper.classList.remove("sucess");
        otp_form_button.classList.remove("activate");
        alert_wrapper.classList.add("transit");
    };
    const alert_validating = (msg) => {
        alert_text.innerHTML = msg;
        alert_wrapper.classList.remove("fail");
        alert_wrapper.classList.remove("sucess");
        otp_form_button.classList.remove("activate");
        alert_wrapper.classList.add("transit");
    };

    otp_input.onkeyup = (e) => {
        const value = e.target.value;
        const regex = /^\d+$/;
        if (value.match(regex)) {
            if (value.length < 5) { alert_validating("Validating input ...") }
            else {
                if (value.match("[0-9]{4}") && value.length == 5) { alert_sucess("OTP input validated! Proceed ") }
                else { 
                    alert_fail("Error. OTP exceeds required length"); 
                    setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000);
                }
            }
        }
        else if (value.length == 0) { 
            alert_fail("Error. Provide OTP codes !");
            setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000); 
        }
        else { 
            alert_fail("Error. OTP requires only numbers!");
            setTimeout(() => { alert_wrapper.classList.remove("transit"); }, 5000);
        }
    }
})();