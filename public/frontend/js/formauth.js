import { randomNumbers, randomLetters } from "../utils/generate-code.js"; 

// NOTIFICATION SECTION 
const notify_user = (msg) => {
    // define  paramters 
        const notification_wrapper = document.querySelector(".notification-wrapper");
        const content = notification_wrapper.querySelector(".notification-text");
        const notification_container = notification_wrapper.querySelector(".notification-container");
    // ...
    // defining modules 
        const remove_alert = () => { notification_wrapper.classList.remove("show") };
        const show_alert = () => {
            notification_wrapper.classList.add("show");
            setTimeout(() => { remove_alert() }, 3000);
        };
    // ...
    // setting logic for showing notification 
        if (notification_wrapper.classList.contains("show2")) {
            notification_wrapper.classList.add("show");
            setTimeout(() => { notification_wrapper.classList.remove("show2") }, 8000);
        }
        if (msg == undefined) { remove_alert() } 
        else {
            content.innerHTML = msg;
            if (content.innerHTML.includes("Error")) { notification_container.classList.remove("sucess"); notification_container.classList.remove("proceed") }
            else if (content.innerHTML.includes("__")) { notification_container.classList.add("proceed"); notification_container.classList.remove("sucess")}
            else { notification_container.classList.remove("proceed"); notification_container.classList.add("sucess") }
            show_alert()
        }
    // ...
};notify_user();
const sending_data_to_server = async (url, payload) => {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.status === 200 && response.statusText === "OK") { return await response.json(); }
        else { return 400 }

    } catch (error) {
        return false;
    }
};
const load_data_from_server = async (url, payload) => {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (response.status === 200 && response.statusText === "OK") { return await response.json(); }
        else { return 400 }

    } catch (error) {
        return false;
    }
};
const validating_input_before_submission = async (input_el_in_array, iteration_number = null) => {
    let count = 0, decount = 0;
    if ((iteration_number !== null) && (typeof iteration_number === "number")) {
        for (let i = 0; i < iteration_number; i++) {
            const input = input_el_in_array[i];
    
            if (input.value !== "") { count++ }
            else { decount++ }
        }
        // console.log("count", count, "decount", decount);
        if ( (count + decount) === iteration_number ) {
            if (decount === 0) { return true }
            else { return false }
        }
    }else if ((iteration_number !== null) && (typeof iteration_number === "string")) { return false }
    else {
        for (let i = 0; i < input_el_in_array.length; i++) {
            const input = input_el_in_array[i];
    
            if (input.value !== "") { count++ }
            else { decount++ }
        }
        // console.log("count", count, "decount", decount);
        if ( (count + decount) === input_el_in_array.length ) {
            if (decount === 0) { return true }
            else { return false }
        }
    }
};
const activate_gif_loader = (div_element) => { div_element.classList.add("show"); };
const deactivate_gif_loader = (div_element) => { div_element.classList.remove("show"); };

// ....
// DEPARTMENT MULTIPLE OPTIONS
(() => {
    const display_card = (array, div) => {
        //  displaying selected options in DOM
        let show = ""
            array.forEach(data => {
                show += `<div class="department-card">
                    <div class="depart-content"> ${data} </div>
                    <div class="depart-close-button"></div>
                </div>`;
                div.innerHTML = show;
            });
        // ...
    };
    const remove_opt = () => {
        // removing selected options when the close close button is fired
            const department_close = document.querySelectorAll(".depart-close-button"); // getting close button from DOM
            for (let i = 0; i < department_close.length; i++) { // looping through the array 
                const close_button = department_close[i]; // getting each of the close button.

                close_button.onclick = (e) => { // adding click function to the element
                    // removing items from array 
                        const selected_value = e.target.previousElementSibling.innerText;
                        index = departments.findIndex(data => data == selected_value);
                        departments.splice(index, 1);
                    // ...
                    // removing data from DOM whiles items is removed from the array 
                        const parent_card = e.target.parentElement; // targetting overall parent element 
                        parent_card.remove();
                    // ...
                    sessionStorage.setItem("reg", JSON.stringify(departments)); // update local session storage with modified array
                }
            }
        // ...
    };

    const department_wrapper = document.querySelector(".department-preview");
    const department_option = document.querySelector("#department-option");

    // changing the default state of the selected tag
    let departments = [];

     // when page refreshed for the first time, display content from session storage if presnet 
    if (sessionStorage.getItem("reg")) { 
        const session_data = JSON.parse(sessionStorage.getItem("reg"));
        departments = session_data;
        display_card(departments, department_wrapper);
        remove_opt();
    }
    // ...
    if (department_option !== null) {
        department_option.onchange = (e) => {
            let proceed  = "";
            //  checking for data in session Storage 
                (sessionStorage.getItem("reg"))?   proceed = true :  select_multiple_option(e);
            // ..
            if (proceed) {
                const session_data = JSON.parse(sessionStorage.getItem("reg")) //  get data from session Storage
                const data_duplicate_status = session_data.findIndex(data => data == e.target.value); // check for duplication of opts
    
                // showing error alert when opts is duplicated or else proceed to select options
                (data_duplicate_status  > -1)? notify_user(`Error. ${e.target.value} already selected.`) : select_multiple_option(e);
            }
        };
    }

    const select_multiple_option = (e) => {
        departments.push(e.target.value); // push value into array 
        sessionStorage.setItem("reg", JSON.stringify(departments)); // store data in local session storage
        display_card(departments, department_wrapper); // displaying opts in DOM
        remove_opt()
    };
})();
// ...
// POPULATING LIST OF BUSINESSES 
(() => {
    const business_wrapper = document.querySelector("#business-wrapper");
    const preview_el = document.querySelector(".preview-company-wrapper");

    if (business_wrapper !== null) {
        const businesses = JSON.parse(business_wrapper.getAttribute("data-com"));
        
        const input = document.querySelector("#input-company");
        input.onkeyup = (e) => {
            const value = e.target.value;
            // checking user value character is of min 3 to proceed 
                if (value.length >= 4) {
                    preview_el.classList.add("show");
                    populate_filtered_data(businesses, value, preview_el);
                    select_filtered_data(input, preview_el);

                }else {
                    preview_el.innerHTML = "";
                    preview_el.classList.remove("show");
                }
            // ...
        }
    }
    const populate_filtered_data = (array, value, div) => {
        const filtered_data = array.filter(data => { return data.trim().startsWith(value.trim()) });
        let show = "";
        filtered_data.forEach(data => {
            show += `
                <li class="preview-opts"><div class="i"></div><div>${data}</div></li>
            `;
            div.innerHTML = show;
        });
    }
    const select_filtered_data = (input_tag, div) => {
        const preview_opts = document.querySelectorAll(".preview-opts");
        preview_opts.forEach(opt => {
            opt.onclick = (e) => {
                const selected_value = e.target.innerText;
                if (selected_value !== "") {
                    input_tag.value = selected_value;  // sshow in DOM and collapse opts 
                    div.innerHTML = ""
                    div.classList.remove("show"); // collaspe opts after selection 
                }
            }
        })

    };
})();
// ...
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
            console.log("... final payload ...", payload);
            
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






export { load_data_from_server, sending_data_to_server, notify_user, validating_input_before_submission, 
    activate_gif_loader, deactivate_gif_loader }