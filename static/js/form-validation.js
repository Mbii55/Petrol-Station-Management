document.getElementById('button').addEventListener('submit', function (event) {
    var email = document.forms["button"]["email"].value;
    var password = document.forms["button"]["password"].value;
    var repeatPassword = document.forms["button"]["repeatPassword"].value;
    var errorMessage = '';

    if (!validateEmail(email)) {
        errorMessage += 'Please enter a valid email address.<br>';
    }

    if (!validatePassword(password)) {
        errorMessage += 'Password must be at least 8 characters long.<br>';
    }

    if (password !== repeatPassword) {
        errorMessage += 'Passwords do not match.<br>';
    }

    if (errorMessage.length > 0) {
        document.getElementById('error-message').innerHTML = errorMessage;
        event.preventDefault();
    }
});

function validateEmail(email) {
    var re = /^\S+@\S+\.\S+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}
