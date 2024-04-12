

// NOTIFICATION SECTION 
const notify_user = (msg) => {
    // define  paramters 
        const notification_wrapper = document.querySelector(".notification-wrapper");
        const content = notification_wrapper.querySelector(".notification-text");
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
            setTimeout(() => { notification_wrapper.classList.remove("show2") }, 3000);
        }
        if (msg == undefined) { remove_alert() } 
        else {
            content.innerHTML = msg;
            show_alert()
        }
    // ...
};notify_user();
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
    department_option.onchange = (e) => {
        let proceed  = "";
        //  checking for data in session Storage 
            (sessionStorage.getItem("reg"))?   proceed = true :  select_multiple_option(e);
        // ..
        if (proceed) {
            const session_data = JSON.parse(sessionStorage.getItem("reg")) //  get data from session Storage
            const data_duplicate_status = session_data.findIndex(data => data == e.target.value); // check for duplication of opts

            // showing error alert when opts is duplicated or else proceed to select options
            (data_duplicate_status  > -1)? notify_user(`${e.target.value} already selected.`) : select_multiple_option(e);
        }
    };

    const select_multiple_option = (e) => {
        departments.push(e.target.value); // push value into array 
        sessionStorage.setItem("reg", JSON.stringify(departments)); // store data in local session storage
        display_card(departments, department_wrapper); // displaying opts in DOM
        remove_opt()
    };
})();
// ...