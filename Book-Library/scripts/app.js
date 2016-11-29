function startApp() {
    const kinveyBaseUrl = "https://baas.kinvey.com/";
    const kinveyAppKey = "kid_SJDfNFdGx";
    const kinveyAppSecret =
        "fe009bfeadcc4d5c84e71dad19161abc";
    const kinveyAppAuthHeaders = {
        'Authorization': "Basic " +
        btoa(kinveyAppKey + ":" + kinveyAppSecret),
    };

    sessionStorage.clear(); // Clear user auth data
    showHideMenuLinks();
    showView('viewHome');

    // Bind the navigation menu links
    $("#linkHome").click(showHomeView);
    $("#linkLogin").click(showLoginView);
    $("#linkRegister").click(showRegisterView);
    $("#linkListBooks").click(listBooks);
    $("#linkCreateBook").click(showCreateBookView);
    $("#linkLogout").click(logoutUser);


    // Bind the form submit buttons
    $("#buttonLoginUser").click(loginUser);
    $("#buttonRegisterUser").click(registerUser);
    $("#buttonCreateBook").click(createBook);
    $("#buttonEditBook").click(editBook);

    // Bind the info / error boxes: hide on click
    $("#infoBox, #errorBox").click(function() {
        $(this).fadeOut();
    });

    // Attach AJAX "loading" event listener
    $(document).on({
        ajaxStart: function() { $("#loadingBox").show() },
        ajaxStop: function() { $("#loadingBox").hide() }
    });

    function showHideMenuLinks() {
        $("#linkHome").show();
        if (sessionStorage.getItem('authToken')) {
            // We have logged in user
            $("#linkLogin").hide();
            $("#linkRegister").hide();
            $("#linkListBooks").show();
            $("#linkCreateBook").show();
            $("#linkLogout").show();
        } else {
            // No logged in user
            $("#linkLogin").show();
            $("#linkRegister").show();
            $("#linkListBooks").hide();
            $("#linkCreateBook").hide();
            $("#linkLogout").hide();
        }
    }

    function showView(viewName) {
        $('body > section').hide();

        $('#' + viewName).show();
    }

    function showHomeView() {
        showView('viewHome');
    }

    function showRegisterView() {
        $('#formRegister').trigger('reset');
        showView('viewRegister');
    }

    function showCreateBookView() {
        $('#formCreateBook').trigger('reset');
        showView('viewCreateBook');
        $('#formCreateBook input[name=author]').val(sessionStorage.getItem('username')).prop('disabled', true);


    }

    function showLoginView() {
        showView('viewLogin');
        $('#formLogin').trigger('reset');
    }

    function loginUser() {
        let userData = {
            username: $('#formLogin input[name=username]').val(),
            password: $('#formLogin input[name=passwd]').val()
        };
        let logRequest = {
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + '/login',
            data: JSON.stringify(userData),
            headers: kinveyAppAuthHeaders,
            contentType: 'application/json'
        };

        $.ajax(logRequest)
            .then(function (userInfo) {
                saveAuthInSession(userInfo);
                showHideMenuLinks();
                listBooks();
                showInfo('Login successful.');

            })
            .catch(handleAjaxError);
    }

    function registerUser() {
        let userData = {
            username: $('#formRegister input[name=username]').val(),
            password: $('#formRegister input[name=passwd]').val()
        };

        let regRequest = {
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey,
            data: JSON.stringify(userData),
            headers: kinveyAppAuthHeaders,
            contentType: 'application/json'
        };

        $.ajax(regRequest)
            .then(function (userInfo) {
                saveAuthInSession(userInfo);
                showHideMenuLinks();
                listBooks();

                showInfo('User registration successful.');

            })
            .catch(handleAjaxError);
    }

    function saveAuthInSession(userInfo) {
        let userAuth = userInfo._kmd.authtoken;
        sessionStorage.setItem('authToken', userAuth);
        let userId = userInfo._id;

        let author = userInfo.username;
        sessionStorage.setItem('username', author);

        sessionStorage.setItem('userId', userId);
        let username = userInfo.username;
        $('#loggedInUser').text(
            "Welcome, " + username + "!");
    }

    function handleAjaxError(response) {
        let errorMsg = JSON.stringify(response);
        if (response.readyState === 0)
            errorMsg = "Cannot connect due to network error.";
        if (response.responseJSON &&
            response.responseJSON.description)
            errorMsg = response.responseJSON.description;
        showError(errorMsg);
    }

    function showInfo(message) {
        $('#infoBox').text(message);
        $('#infoBox').show();
        setTimeout(function() {
            $('#infoBox').fadeOut();
        }, 3000);
    }

    function showError(errorMsg) {
        $('#errorBox').text("Error: " + errorMsg);
        $('#errorBox').show();
    }

    function logoutUser() {
        sessionStorage.clear();
        showHideMenuLinks();
        showHomeView();
        $('#loggedInUser').text('');
        showInfo('Logout successful.');
    }

    function listBooks() {
        $('#books').empty();
        showView('viewBooks');

        let getRequest = {
            method:"GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/books/",
            headers:getKinveyUserAuthHeaders(),
        };

        $.ajax(getRequest)
            .then(showBooks)
            .catch(handleAjaxError);

        function showBooks(books) {
            let conteiner = $('#books');
            let userId = sessionStorage.getItem('userId');

            let table = $('<table>');
            table.append($(`<tr>
                <th>Title</th>
                <th>Author</th>
                <th>Description</th>
                <th>Actions</th>
            </tr>`));

            conteiner.append(table);
            for(let book of books){
                generateHTML(book,table);
            }

            function generateHTML(book,table) {
                let tr = $('<tr>');
                tr.append($("<td>").text(book.title))
                    .append($("<td>").text(book.author))
                    .append($("<td>").text(book.description));

                    if(userId == book._acl.creator){
                        let delHref =$('<a href="#">').text('[Delete]');
                        let editHref =$('<a href="#">').text('[Edit]');
                        delHref.on('click',function () {
                            deleteBook(book._id)
                        });
                        editHref.on('click',function () {
                            loadBookForEdit(book);
                        });
                        tr.append($("<td>").append(delHref).append(" ").append(editHref));
                    }else
                        tr.append($("<td>"));


                table.append(tr);
            }
        }
    }

    function getKinveyUserAuthHeaders() {
        return {
            'Authorization': "Kinvey " +
            sessionStorage.getItem('authToken'),
        };
    }

    function createBook() {
        let title = $('#formCreateBook input[name=title]').val();
        let descr = $('#formCreateBook textarea[name=descr]').val();
        let author = $('#formCreateBook input[name=author]').val();
        let newBook = {
            title:title,
            author:author,
            description:descr
        };

        let createRequest = {
            method:"POST",
            url: kinveyBaseUrl + 'appdata/' + kinveyAppKey + "/books/",
            headers: getKinveyUserAuthHeaders(),
            data: JSON.stringify(newBook),
            contentType: 'application/json'
        };

        $.ajax(createRequest)
            .then(function () {
                listBooks();
                showInfo('Book created successful.');
            })
            .catch(handleAjaxError);
    }

    function loadBookForEdit(book){
        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" +
                kinveyAppKey + "/books/" + book._id,
            headers: getKinveyUserAuthHeaders(),
            success: loadBookForEditSuccess,
            error: handleAjaxError
        });

        function loadBookForEditSuccess(book) {
            $('#formEditBook input[name=id]').val(book._id);
            $('#formEditBook input[name=title]').val(book.title);
            $('#formEditBook input[name=author]')
                .val(book.author);
            $('#formEditBook textarea[name=descr]')
                .val(book.description);
            showView('viewEditBook');
        }

    }

    function editBook() {

            let title = $('#formEditBook input[name=title]').val();
            let descr = $('#formEditBook textarea[name=descr]').val();
            let author = $('#formEditBook input[name=author]').val();

            let editBook = {
                title:title,
                author:author,
                description:descr
            };

            let editRequest = {
                method:"PUT",
                url: kinveyBaseUrl + 'appdata/' + kinveyAppKey + "/books/" + $('#formEditBook input[name=id]').val(),
                data: JSON.stringify(editBook),
                headers: getKinveyUserAuthHeaders(),
                contentType: 'application/json'
            };

            $.ajax(editRequest)
                .then(function () {
                    listBooks();
                    showInfo('Book edited successful')
                })
                .catch(handleAjaxError);

    }

    function deleteBook(id) {
        console.log(this);
        let delRequest = {
            method:"DELETE",
            url:kinveyBaseUrl + 'appdata/' + kinveyAppKey + "/books/" + id,
            headers: getKinveyUserAuthHeaders(),
        };

        $.ajax(delRequest)
            .then(listBooks)
            .catch(handleAjaxError);
    }

}
