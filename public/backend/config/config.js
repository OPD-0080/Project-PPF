const GET_base_url = "/api/get/user";
const POST_base_url = "/api/post/user";

const config = {
    company_name: "Project PPF",

    GET_url: GET_base_url,
    POST_url: POST_base_url,
    
    post_urls: {
        register: `${POST_base_url}/register`,
        user_register: `${POST_base_url}/user-register`,
        login: `${POST_base_url}/login`,
        otp: `${POST_base_url}/otp/verification`,
        
    },

    view_urls: {
        register: `${GET_base_url}/register`,
        user_register: `${GET_base_url}/user-register`,
        login: `${GET_base_url}/login`,
        logout: `${GET_base_url}/logout`,
        dashboard: `${GET_base_url}/dashboard`,
        _404: `${GET_base_url}/404`,
        _500: `${GET_base_url}/500`,

    },


}

module.exports = config 