"use strict";

import { randomNumbers, randomLetters } from "../utils/generate-code.js"; 
import { load_data_from_server, sending_data_to_server, notify_user, validating_input_before_submission, 
    activate_gif_loader, deactivate_gif_loader } from "./formauth.js"; 

// PURCHASES PAGE SECTION
(async () => {
    const purchases_wrapper = document.querySelector(".purhases-wrapper");
    if (purchases_wrapper !== null) {
        const activate_input_indicator = (e) => {
            e.target.parentElement.previousElementSibling.querySelector(".text-danger").classList.remove("hide");
            return
        };
        const deactivate_input_indicator = (e) => {
            e.target.parentElement.previousElementSibling.querySelector(".text-danger").classList.add("hide");
            return
        };
        const isValueANumbers = async (value) => {
            if (isNaN(value)) { return false }
            else { return true }
        };


        const form_controls = purchases_wrapper.querySelectorAll(".form-control");
        const form_button = purchases_wrapper.querySelector(".purchases-button");
        const form_button_wrapper = purchases_wrapper.querySelector(".purchases-button-wrapper");
        const copy_paste_buttons = purchases_wrapper.querySelectorAll(".purchases-copy-paste-button");
        const gif_loader = purchases_wrapper.querySelector(".loading-gif");
        
        const random_numbers = await randomNumbers(5);
        const random_letters = await randomLetters(3);
        const item_code = `${random_letters}-${random_numbers}`;

        let payload = {};
        form_controls.forEach(input => {
            if (input.classList.contains("item-code")) { 
                input.value = item_code;
                payload.item_code = item_code;
            };
            input.onkeyup = async (e) => {
                if (e.target.classList.contains("supplier")) {
                    const value = e.target.value;
                    payload.supplier = value.toLocaleLowerCase(); 
                    
                    if (value.length !== 0) { deactivate_input_indicator(e); }
                    else { activate_input_indicator(e); }
                };
                if (e.target.classList.contains("invoice-number")) {
                    const value = e.target.value;
                    if (await isValueANumbers(value)) {
                        payload.invoice_number = value;
                        deactivate_input_indicator(e);
                    }else {
                        notify_user("Error. 'Invoice Number' must be only number(s) !")
                        activate_input_indicator(e);
                    }
                };
                if (e.target.classList.contains("particular")) {
                    const value = e.target.value;
                    payload.particular = value.toLocaleLowerCase(); 
                    
                    if (value.length !== 0) { deactivate_input_indicator(e); }
                    else { activate_input_indicator(e); }
                };
                if (e.target.classList.contains("quantity")) {
                    const value = e.target.value;
                    if (await isValueANumbers(value)) {
                        payload.quantity = value;
                        deactivate_input_indicator(e);
                    }else {
                        notify_user("Error. 'Quantity' must be only numbers(s) !")
                        activate_input_indicator(e);
                    }
                };
                if (e.target.classList.contains("price")) {
                    const value = e.target.value;
                    if (await isValueANumbers(value)) {
                        payload.price = value;
                        deactivate_input_indicator(e);

                        if (payload.hasOwnProperty("quantity")) {
                            if (payload.quantity == "") {
                                notify_user("Error. Provide 'Quantity' input first before 'Price' input."); 
                                activate_input_indicator(e);
                                purchases_wrapper.querySelector(".price").value = "";
                            }else {
                                payload.amount = (Number(payload.quantity) * Number(payload.price)).toFixed(2);
                                purchases_wrapper.querySelector(".amount").value = payload.amount;
                            }
                        }
                        else { 
                            notify_user("Error. Provide 'Quantity' input first before 'Price' input."); 
                            activate_input_indicator(e);
                        }
                    }else {
                        notify_user("Error. 'Price' must be only numbers(s) !")
                        activate_input_indicator(e);
                    }
                };
            };
            input.onchange = (e) => {
                if (e.target.classList.contains("invoice-date")) {
                    const date = e.target.value.split("-").reverse();
                    const value = date.join("-");

                    if (value.match("[0-9]{2}-[0-9]{2}-[0-9]{4}")) {
                        payload.invoice_date = value;
                        deactivate_input_indicator(e);
                    }else {
                        notify_user("Error. Invalid date format. Format required 'dd-mm-yyyy'.");
                        activate_input_indicator(e); 
                    }
                }
            }
        });
        form_button.onclick = async (e) => {
            // console.log("... final payload ...", payload);
            if (await validating_input_before_submission(form_controls)) {
                notify_user("__Sumission initiated."); 
                activate_gif_loader(gif_loader);

                const url = form_button_wrapper.getAttribute("data-purchases");
                const responses = await sending_data_to_server(`${url}`, payload);
                
                if (typeof responses === "object") { 
                    setTimeout(() => {  
                        notify_user("Purchase submisson sucess"); 
                        deactivate_gif_loader(gif_loader); 
                        form_controls.forEach(el => { el.value = "" });
                    }, 3000) 
                }
                else if ((typeof responses === "Number") && (responses === 400)) { notify_user("Error. Purchase submission failed. Try Again"); }
                else { notify_user("Error. Network Connection Bad. Check Net Connection !"); }
            }
            else { notify_user("Error. Misssing input. All input are required !");  }
        };
        copy_paste_buttons.forEach(button => {
            button.onclick = async (e) => {
                if (e.target.classList.contains("copy")) {
                    if (await validating_input_before_submission(form_controls, 4)) {
                        const copy_payload = {
                            supplier: payload.supplier,
                            invoice_date: payload.invoice_date,
                            invoice_number: payload.invoice_number,
                            item_code: payload.item_code
                        }
                        sessionStorage.setItem("copy", JSON.stringify(copy_payload));
                        notify_user("__Data Copied. Ready to Paste.");
                    }else { notify_user("Error. Misssing input. Provide required input before copying !");  }

                }else if (e.target.classList.contains("paste")) {
                    if (sessionStorage.getItem("copy")) {
                        payload = JSON.parse(sessionStorage.getItem("copy"));
                        
                        for (let i = 0; i < 4; i++) {
                            const input = form_controls[i];
                            if (input.classList.contains("supplier")) { input.value = payload.supplier };
                            if (input.classList.contains("invoice-date")) { input.value = payload.invoice_date.split("-").reverse().join("-") }
                            if (input.classList.contains("invoice-number")) { input.value = payload.invoice_number };
                            if (input.classList.contains("item-code")) { input.value = payload.item_code };
                            notify_user("__Data Pasted.");
                        }
                    }else{ notify_user("Error. Copy data first then Paste.") }

                }
            }
        })

    }
})();
// 

// PURCHASES PREVIEW 
(() => {
    const tb_wrapper = document.querySelector(".tb-wrapper");
    if (tb_wrapper !== null) {
        const form_check_input = tb_wrapper.querySelectorAll(".form-check-input");
        const tb_body_wrapper = document.querySelector(".tb-body-wrapper");
        const tb_row_buttons = tb_wrapper.querySelectorAll(".purchases-buttons-wrapper");
        const tb_rows = tb_body_wrapper.querySelectorAll(".each-list-cell");
        
        const highlight_selected_list = async (selected_parent_el = null, checkbox_as_array = null ) => {
            if ((checkbox_as_array !== null) && (selected_parent_el == null)) {
                checkbox_as_array.forEach(box => { box.parentElement.parentElement.parentElement.classList.add("selected"); });
                return
            }else if ((checkbox_as_array == null) && (selected_parent_el !== null)) { selected_parent_el.classList.add("selected"); return }
        };
        const remove_highlight_selected_list = async (selected_parent_el = null, checkbox_as_array = null ) => {
            if ((checkbox_as_array !== null) && (selected_parent_el == null)) {
                checkbox_as_array.forEach(box => { box.parentElement.parentElement.parentElement.classList.remove("selected"); });
                return
            }else if ((checkbox_as_array == null) && (selected_parent_el !== null)) { selected_parent_el.classList.remove("selected"); return }
        };



        form_check_input.forEach(checkbox => {
            checkbox.onclick = async (e) => {
                const box = e.target;
                if (box.classList.contains("checkall")) {
                    if (box.checked) {
                        await highlight_selected_list(null, form_check_input);


                    }else {
                        await remove_highlight_selected_list(null, form_check_input);


                    }
                };
                if (box.classList.contains("selected-box")) {
                    const selected_row = box.parentElement.parentElement.parentElement;
                    if (box.checked) {
                        await highlight_selected_list(selected_row, null);
                        

                    }else {
                        await remove_highlight_selected_list(selected_row, null);

                    }
                }
                
            }
        });



    }
})();
// 
