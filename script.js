window.onload = function() {
    document.querySelectorAll('.news-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 200);
    });
};

/* Toggle between adding and removing the "responsive" class to navigation when the user clicks on the icon */
function myFunction() {
    var x = document.getElementById("mynavigation");
    if (x.className === "navigation") {
        x.className += " responsive";
    } else {
        x.className = "navigation";
    }
}