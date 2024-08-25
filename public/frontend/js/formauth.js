"use strict";

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
            setTimeout(() => { remove_alert() }, 5000);
        };
    // ...
    // setting logic for showing notification 
        if (notification_wrapper.classList.contains("show2")) {
            notification_wrapper.classList.add("show");
            setTimeout(() => { notification_wrapper.classList.remove("show2") }, 10000);
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
const load_data_from_server = async (url) => {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        console.log(response);

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
const submit_form_template = (url, payload) => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    const submit = document.createElement("input");
    form.setAttribute("action", `${url}`);
    form.setAttribute("method", `post`);
    input.setAttribute("name", `payload`);
    input.setAttribute("value", `${payload}`);
    input.setAttribute("type", "text");
    submit.setAttribute("type", "submit");
    form.append(input); form.append(submit);
    document.body.append(form);
    submit.click();
}

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
        const filtered_data = array.filter(data => { return data.name.trim().startsWith(value.trim()) });
        let show = "";
        filtered_data.forEach(data => {
            show += `
                <li class="preview-opts"><img src="${(data.photo)? data.photo : '/img/svg/home-black.svg'}" class="i"></img><div>${data.name}</div></li>
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






export { load_data_from_server, sending_data_to_server, notify_user, validating_input_before_submission, 
    activate_gif_loader, deactivate_gif_loader, submit_form_template }