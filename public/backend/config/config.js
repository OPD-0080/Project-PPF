const GET_base_url = "/api/get/user";
const POST_base_url = "/api/post/user";

const previliges_options = {
    modify: "modify",
    delete: "delete",
    create: "create",
} 
const config = {
    company_name: "Project PPF",
    userID_regexp: "[a-z]{3}[0-9]{5}",
    default_pass_regexp: "[a-z]{6}[0-9]{5}",
    previliges: {
        documents: {
            ...previliges_options,
            report: "report",
        },
        user: {
            ...previliges_options,
        }
    },
    pageon: {
        purchases: "purchases",
    },
    roles: {
        admin: "admin",
        managing_director: "managing_director",
        operation_manager: "operation_manager",
        
        sales_lead: "sales_lead",
        inventory_lead: "inventory_lead",
        purchases_lead: "purchases_lead",
        account_lead: "account_lead",

        sales: "sales",
        inventory: "inventory",
        purchases: "purchases",
        account: "account",
    },

    GET_url: GET_base_url,
    POST_url: POST_base_url,
    
    post_urls: {
        register: `${POST_base_url}/register`,
        user_register: `${POST_base_url}/user-register`,
        login: `${POST_base_url}/login`,
        otp: `${POST_base_url}/otpverification`,
        otp_resend: `${POST_base_url}//password/forgot/resend`,
        reset_password: `${POST_base_url}/password/reset`,
        forgot_password_initiate: `${POST_base_url}/password/forgot/initiate`,
        forgot_password_confirm: `${POST_base_url}/password/forgot/confirmation`,
        purchases_entry: `${POST_base_url}/purchases/entry`,
        purchases_preview: `${POST_base_url}/purchases/preview`,
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
        purchase: `${GET_base_url}/purchases`,
        purchase_preview: `${GET_base_url}/purchasepreview`,
        purchase_responds: `${GET_base_url}/purchasesresponds`,
    },


}

module.exports = config 