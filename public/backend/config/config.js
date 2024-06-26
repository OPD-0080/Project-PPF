const GET_base_url = "/api/get/user";
const POST_base_url = "/api/post/user";

const config = {
    company_name: "Project PPF",
    userID_regexp: "[a-z]{3}[0-9]{5}",
    default_pass_regexp: "[a-z]{6}[0-9]{5}",

    GET_url: GET_base_url,
    POST_url: POST_base_url,
    
    post_urls: {
        register: `${POST_base_url}/register`,
        user_register: `${POST_base_url}/user-register`,
        login: `${POST_base_url}/login`,
        otp: `${POST_base_url}/otp/verification`,
        reset_password: `${POST_base_url}/password/reset`,
        forgot_password_initiate: `${POST_base_url}/password/forgot/initiate`,
        forgot_password_confirm: `${POST_base_url}/password/forgot/confirmation`,
    },

    view_urls: {
        register: `${GET_base_url}/register`,
        user_register: `${GET_base_url}/user-register`,
        login: `${GET_base_url}/login`,
        logout: `${GET_base_url}/logout`,
        dashboard: `${GET_base_url}/dashboard`,
        otp: `${GET_base_url}/otpverification`,
        reset_password: `${GET_base_url}/resetpassword`,
        forgot_password_initiate: `${GET_base_url}/forgotpasswordinitiate`,
        forgot_password_confirm: `${GET_base_url}/forgotpasswordconfirm`,
        _404: `${GET_base_url}/404`,
        _500: `${GET_base_url}/500`,

    },


}

module.exports = config 