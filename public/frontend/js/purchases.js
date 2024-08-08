"use strict";

import { randomNumbers, randomLetters } from "../utils/generate-code.js"; 
import { load_data_from_server, sending_data_to_server, notify_user, validating_input_before_submission, 
    activate_gif_loader, deactivate_gif_loader } from "./formauth.js"; 

// GLOBAL FUNCTION
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
// END

// PURCHASES ENTRY PAGE SECTION
(async () => {
    const purchases_wrapper = document.querySelector(".purhases-wrapper");
    if (purchases_wrapper !== null) {

        const form_controls = purchases_wrapper.querySelectorAll(".form-control");
        const form_button = purchases_wrapper.querySelector(".purchases-button");
        const form_button_wrapper = purchases_wrapper.querySelector(".purchases-button-wrapper");
        const copy_paste_buttons = purchases_wrapper.querySelectorAll(".purchases-copy-paste-button");
        const gif_loader = purchases_wrapper.querySelector(".loading-gif");
        
        const genearte_random_code = async () => {
            const random_numbers = await randomNumbers(5);
            const random_letters = await randomLetters(3);
            return `${random_letters}-${random_numbers}`;
        }
        const item_code = await genearte_random_code();

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

                        if (payload.hasOwnProperty("price")) {
                            if (payload.price == "") {
                                notify_user("Error. 'Pirce' input is required !."); 
                                activate_input_indicator(e);
                            }else {
                                payload.amount = (Number(payload.quantity) * Number(payload.price)).toFixed(2);
                                overlay_page_wrapper.querySelector(".amount").value = payload.amount;
                            }
                        }
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
                        form_controls.forEach( async el => { 
                            el.value = "";
                            if (el.classList.contains("item-code")) { el.value = await genearte_random_code(); }; 
                        });
                    }, 3000);
                }
                else if ((typeof responses === "number") && (responses === 400)) { notify_user("Error. Purchase submission failed. Try Again"); }
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
// END

// PURCHASES PREVIEW 
(async () => {
    const tb_wrapper = document.querySelector(".tb-wrapper");
    if (tb_wrapper !== null) {
        const tb_body_wrapper = document.querySelector(".tb-body-wrapper");
        const purchases_modify_button_wrapper = document.querySelector(".purchases-buttons-wrapper");
        const modification_buttons = purchases_modify_button_wrapper.querySelectorAll(".btn");
        const overlay_page_wrapper  = document.querySelector(".overlay-page-wrapper");
        const overlay_page_container = overlay_page_wrapper.querySelector(".overlay-page-container");
        const overlay_page_close_button = document.querySelectorAll(".overlay-close-button");
        const form_controls = overlay_page_wrapper.querySelectorAll(".form-control");
        const overlay_submit_button_wrapper = overlay_page_wrapper.querySelector(".modify-button-wrapper");
        const overlay_submit_button = overlay_submit_button_wrapper.querySelector(".btn");
        const auth_page_wrapper = document.querySelector(".auth-page-wrapper");
        const auth_page_container = auth_page_wrapper.querySelector(".auth-page-container");
        const auth_page_button = auth_page_wrapper.querySelector(".auth-page-button");
        const auth_input = auth_page_wrapper.querySelector("#auth_code");
        const gif_loader = auth_page_wrapper.querySelector(".loading-gif");
        const form_button = overlay_page_wrapper.querySelector(".purchases-button");
        

        let payload = {};
        const loading_purchases_from_database = async () => {
            const url = tb_wrapper.getAttribute("data-url");
            return await load_data_from_server(`${url}`);
        };
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
        const show_remove_modify_buttons = (edit_button_disabled = false, delete_button_disabled = false) => { 
            let status = [];
            for (let i = 1; i < form_check_input.length; i++) {
                const el = form_check_input[i];
                if (el.parentElement.parentElement.parentElement.classList.contains("selected")) { status.push(true) }
                else { status.push(false)}
            }

            if ((form_check_input.length - 1) === status.length) {
                if (status.find(el => { return el === true }) === undefined) { 
                    purchases_modify_button_wrapper.classList.remove("show-buttons"); 
                }
                else { 
                    purchases_modify_button_wrapper.classList.add("show-buttons");
                    if (edit_button_disabled && !delete_button_disabled) { 
                        modification_buttons.forEach(el => { if (el.classList.contains("edit")) { el.classList.remove("hide") }});
                        modification_buttons.forEach(el => { if (el.classList.contains("delete")) { el.classList.add("hide") }});
                    }
                    else  if (!edit_button_disabled && delete_button_disabled) { 
                        modification_buttons.forEach(el => { if (el.classList.contains("edit")) { el.classList.add("hide") }});
                        modification_buttons.forEach(el => { if (el.classList.contains("delete")) { el.classList.remove("hide") }});
                    }else { modification_buttons.forEach(el => { el.classList.remove("hide") }); }
                }
            }
        };
        const display_purchases_content = async (data_as_array) => {
            let show = "";
            if (data_as_array === null) {
                show +=`
                    <div class="empty-preview-wrapper"><h5 class="i">Data Not Found</h5></div>
                `;
                tb_body_wrapper.innerHTML = show;
            }else {
                const indexes = Array.from({length: data_as_array.length}, (_, i) => i + 1);
                for (let i = 0; i < data_as_array.length; i++) {
                    const data = data_as_array[i];
                    const number = indexes[i];
                    
                    show +=`
                        <tr class="each-list-cell" data-uid="${data.uuid}">
                            <td>
                                <div class="form-check custom-checkbox checkbox-success check-lg me-3">
                                    <input type="checkbox" class="form-check-input selected-box" id="customCheckBox2" required="">
                                    <label class="form-check-label" for="customCheckBox2"></label>
                                </div>
                            </td>
                            <th class="text-black">${number}</th>
                            <td>${data.supplier}</td>
                            <td>${data.invoice_date}</td>
                            <td>#${data.invoice_number}</td>
                            <td>${data.particular}</td>
                            <td>${data.quantity}</td>
                            <td class="color-primary">Ghc ${data.price}</td>
                            <td class="color-primary">Ghc ${data.amount}</td>
                        </tr>
                    `;
                    tb_body_wrapper.innerHTML = show;
                };
            }
        };
        const save_selected_items = async (selected_item) => {
            if (sessionStorage.getItem("dumpsite")) {
                const selected_items = JSON.parse(sessionStorage.getItem("dumpsite"));                                    

                if (typeof selected_items === "object") {
                    const is_data_duplicated = selected_items.find(uid => { return uid ===  selected_item.uuid});

                    if (is_data_duplicated === undefined) {
                        selected_items.push(selected_item.uuid);
                        sessionStorage.setItem("dumpsite", JSON.stringify(selected_items));
                        modification_buttons.forEach(button => { button.setAttribute("data-uid", JSON.stringify(selected_items))});
                        return true;

                    }else { return false };
                }
            }else {
                sessionStorage.setItem("dumpsite", JSON.stringify([selected_item.uuid]));
                modification_buttons.forEach(button => { button.setAttribute("data-uid", JSON.stringify(JSON.parse(sessionStorage.getItem("dumpsite"))) )});
            }
        };
        const remove_selected_items = async (selected_item) => {
            if (sessionStorage.getItem("dumpsite")) {
                const selected_items = JSON.parse(sessionStorage.getItem("dumpsite"));                                    

                if (typeof selected_items === "object") {
                    const item_index = selected_items.findIndex(uid => { return uid ===  selected_item.uuid});

                    if (item_index >= 0) {
                        selected_items.splice(item_index, 1);
                        sessionStorage.setItem("dumpsite", JSON.stringify(selected_items));
                        modification_buttons.forEach(button => { button.setAttribute("data-uid", JSON.stringify(selected_items))});

                    }else { return false };
                }
            }else { return false };
        };
        const populate_data_upon_modifiation = async (payload_as_object) => {
            document.querySelector("#header-item-code").innerHTML = payload_as_object.item_code;
            for (let i = 0; i < form_controls.length; i++) {
                const input = form_controls[i];
                
                if (input.classList.contains("supplier")) { input.value = payload_as_object.supplier; payload.supplier = payload_as_object.supplier; }
                if (input.classList.contains("invoice-date")) { input.value = payload_as_object.invoice_date.split("-").reverse().join("-"); payload.invoice_date = payload_as_object.invoice_date.split("-").reverse().join("-") }
                if (input.classList.contains("invoice-number")) { input.value = payload_as_object.invoice_number; payload.invoice_number = payload_as_object.invoice_number; }
                if (input.classList.contains("item-code")) { input.value = payload_as_object.item_code; payload.item_code = payload_as_object.item_code;  }
                if (input.classList.contains("particular")) { input.value = payload_as_object.particular; payload.particular = payload_as_object.particular;  }
                if (input.classList.contains("quantity")) { 
                    input.value = payload_as_object.quantity; 
                    payload.quantity = payload_as_object.quantity; 
                }
                if (input.classList.contains("price")) { 
                    input.value = payload_as_object.price; 
                    payload.price = payload_as_object.price; 
                }
                if (input.classList.contains("amount")) { 
                    const total = Number(payload.quantity) * Number(payload.price);
                    input.value = total; 
                    payload.amount = total; 
                } 
                
            }
        };
        const remove_all_overlays_pages = () => {
            overlay_page_wrapper.classList.remove("show");
            overlay_page_container.classList.remove("show");
            purchases_modify_button_wrapper.classList.add("show-buttons");
            auth_page_wrapper.classList.remove("show");
            auth_page_container.classList.remove("show");
            if (gif_loader !== undefined) { deactivate_gif_loader(gif_loader); };
        };


        // loading payload from database and populating data in DOM
            const server_payload = await loading_purchases_from_database();
            const purchases = server_payload.purchases;
            if (server_payload === 404) { 
                display_purchases_content(null);
                notify_user("Error. Inernet Connection Bad. Try Again !") 
            }
            else if (purchases.length <= 0) { display_purchases_content(null); }
            else { 
                display_purchases_content(purchases); 
                sessionStorage.removeItem("dumpsite");
                // updating_data_at_dumpsite(purchases);
            }
        //  End

        //  Highligth and get data upon selection
            const form_check_input = tb_wrapper.querySelectorAll(".form-check-input"); 
            form_check_input.forEach(checkbox => {
                checkbox.onclick = async (e) => {
                    const box = e.target; 
                    if (box.classList.contains("checkall")) {
                        if (box.checked) {
                            await highlight_selected_list(null, form_check_input);
                            show_remove_modify_buttons(false, true);
                            purchases.forEach(async data => { await save_selected_items(data);  });

                        }else {
                            await remove_highlight_selected_list(null, form_check_input);
                            show_remove_modify_buttons();
                            purchases.forEach(async data => { await remove_selected_items(data);  });
                        }
                    };
                    if (box.classList.contains("selected-box")) {
                        const selected_row = box.parentElement.parentElement.parentElement;
                        const selected_item_uuid = selected_row.getAttribute("data-uid");

                        if (box.checked) {
                            await highlight_selected_list(selected_row, null);
                            
                            // getting selected data upon selection and saving the items in sessionStorage
                                const selected_item = purchases.find(data => { return data.uuid === selected_item_uuid });
                                await save_selected_items(selected_item);
                            // end
                            //  showing and removing modified btutton depnding on the number of data in dumpsite upon multiple selection
                                if (sessionStorage.getItem("dumpsite")) {
                                    if ( JSON.parse(sessionStorage.getItem("dumpsite")).length > 1 ) { show_remove_modify_buttons(false, true) }
                                    else { show_remove_modify_buttons(); }
                                }else { show_remove_modify_buttons(); }
                            // 

                            form_check_input.forEach(el => { if (el.classList.contains("checkall")) { el.checked = false; } });

                        }else {
                            await remove_highlight_selected_list(selected_row, null);
                            form_check_input.forEach(el => { if (el.classList.contains("checkall")) { el.checked = false; } });

                            // remving selected items and updating data in session storage 
                                const selected_item = purchases.find(data => { return data.uuid === selected_item_uuid });
                                await remove_selected_items(selected_item);
                            // end
                            //  showing and removing modified btutton depnding on the number of data in dumpsite upon multiple selection
                                if (sessionStorage.getItem("dumpsite")) {
                                    if ( JSON.parse(sessionStorage.getItem("dumpsite")).length > 1 ) { show_remove_modify_buttons(false, true) }
                                    else { show_remove_modify_buttons(); }
                                }else { show_remove_modify_buttons(); }
                            // 
                        }
                    }
                    
                }
            });
        // end

        // validating inputs field 
            form_controls.forEach(input => {
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

                            if (payload.hasOwnProperty("price")) {
                                if (payload.price == "") {
                                    notify_user("Error. 'Pirce' input is required !."); 
                                    activate_input_indicator(e);
                                }else {
                                    payload.amount = (Number(payload.quantity) * Number(payload.price)).toFixed(2);
                                    overlay_page_wrapper.querySelector(".amount").value = payload.amount;
                                }
                            }
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
                                    overlay_page_wrapper.querySelector(".price").value = "";
                                }else {
                                    payload.amount = (Number(payload.quantity) * Number(payload.price)).toFixed(2);
                                    overlay_page_wrapper.querySelector(".amount").value = payload.amount;
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
        // end
        
        // Trigger the modification button to make modification when overlay shows
            modification_buttons.forEach(button => {
                button.onclick = async (e) => {
                    if (e.target.classList.contains("edit")) {
                        overlay_page_wrapper.classList.add("show");
                        setTimeout(() => { overlay_page_container.classList.add("show"); }, 100);
                        purchases_modify_button_wrapper.classList.remove("show-buttons");

                        // getting selected data for editing and populate it in DOM
                            const session_data = JSON.parse(sessionStorage.getItem("dumpsite"))[0];
                            const selected_data = purchases.find(data => { return data.uuid === session_data });
                            await populate_data_upon_modifiation(selected_data);
                        // end
                    }
                    else if (e.target.classList.contains("delete")) { 





                    }
                    else if (e.target.classList.contains("undo")) { 
                        await remove_highlight_selected_list(null, form_check_input);
                        show_remove_modify_buttons();
                        purchases.forEach(async data => { await remove_selected_items(data);  });
                        form_check_input.forEach(el => { el.checked = false; });
                    }
                }
            });
            overlay_page_close_button.forEach(button => {
                button.onclick = () => {
                    remove_all_overlays_pages();
                };
            });
            overlay_submit_button.onclick = async (e) => {
                if (await validating_input_before_submission(form_controls)) {
                    // show auth page overlay buton is triggered
                        auth_page_wrapper.classList.add("show");
                        setTimeout(() => { auth_page_container.classList.add("show"); }, 200);
                    // 
                }
                else { notify_user("Error. Misssing input. All input are required !");  }
            };
            auth_page_button.onclick = async (e) => {
                activate_gif_loader(gif_loader);
                // submitting payload to server 
                    console.log("... geting the final payload ...", payload);

                    const url = e.target.dataset.url;
                    payload.authorization_code = auth_input.value;
                    const responses = await sending_data_to_server(url, payload);
                
                    if (typeof responses === "object") { 
                        setTimeout(() => {  
                            notify_user("Sucess. Request changes will be verify for approval."); 
                            deactivate_gif_loader(gif_loader); 
                            remove_all_overlays_pages();
                        }, 3000);
                    }
                    else if ((typeof responses === "number") && (responses === 400)) { notify_user("Error. Request changes submission failed. Try Again !"); }
                    else { notify_user("Error. Internet Connection Bad. Check Net Connection !"); }



                //  end
            };
        // end

            

    }
})();
// 
