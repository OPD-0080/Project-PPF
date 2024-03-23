

// NOTIFICATION SECTION 
(() => {
    const notification_wrapper = document.querySelector(".notification-wrapper");
    if (notification_wrapper !== null) { // if div element is found 
        // deactivate notification section after 5s
        setTimeout(() => { notification_wrapper.classList.add("show") }, 5000);
    }

})();
// ....