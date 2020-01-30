function init() {    


    $('#noRegistrationForm').submit(function() {

        if ($('noRegistrationNick').val() != "") {
            return true;
        }

        $('noRegistrationError').html("Wpisz swój nick!");
        return false;
    });



    $('#createForm').submit(function() {

        if ( // empty values
            document.getElementById("createUsername").value == undefined
            || document.getElementById("createPassword").value == undefined
            || document.getElementById("createRepeatPassword").value == undefined
        ) {
            document.getElementById("createError").innerHTML = "Żadne pole nie może być puste.";
    //        $('createError').html("Żadne pole nie może być puste.");
            return false;
        }

        if ( // errors detected
            $('createUsernameError').html() != undefined
            || $('createPasswordError').html() != undefined
            || $('createRepeatPasswordError').html() != undefined
        ) {
            document.getElementById("createError").innerHTML = "Popraw błędy.";
    //        $('createError').html("Popraw błędy!");
            return false;
        }

        document.getElementById("createError").innerHTML = "";
        return true;
    });

    $('#loginForm').submit(function() {

        if ( // empty values
            $('loginUsername').val() == ""
            || $('loginPassword').val() == ""
        ) {
            document.getElementById("loginError").innerHTML = "Żadne pole nie może być puste.";
    //        $('loginError').html("Żadne pole nie może być puste.");
            return false;
        }

        document.getElementById("loginError").innerHTML = "";
    //    $('loginError').html("");
        return true;
    });



    $('#createUsername').change(function() {
        var len = $('#createUsername').val().length;
        if (len > 0 & len < 3)
            $('#createUsernameError')
            .html('Nazwa użytkownika powinna składać się przynajmniej z trzech znaków.');

        else {
            $('#createUsernameError')
            .html('');
        }
    });

    $('#createPassword').change(function() {
        var len = $('#createPassword').val().length;
        if (len > 0 & len < 5)
            $('#createPasswordError')
            .html('Hasło powinno składać się przynajmniej z pięciu znaków.');

            else {
                $('#createPasswordError')
                .html('');
            }
    });

    $('#createRepeatPassword').change(function() {
        var v1 = $('#createPassword').val();
        var v2 = $('#createRepeatPassword').val();
        if (v1 != v2)
            $('#createRepeatPasswordError')
            .html('Wpisane hasła nie są takie same.');

        else {
            $('#createRepeatPasswordError')
            .html('');
        }
        
    });





}

    