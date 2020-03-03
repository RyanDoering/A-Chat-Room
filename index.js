

let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);
var cookieParser = require('cookie-parser');
app.use(cookieParser());

var listOfCookies = []; 
var listOfUsers = []; 
var listOfMessages = [];
var listOfCookieUsers = []; //NEW

var newUser;

http.listen(3000, function() {
    console.log("Listening on *:3000");
})

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index1.html'); //Send my html file to the user
});

io.on('connection', function(socket) 
{
    let id = socket.id;
    //Check if a user is already in the list, for cookies

    socket.emit('get cookie', ''); //get the cookie from the client when first logging in

    socket.on('set cookie', function(msg) 
    {
        if (!checkCookies(listOfCookies, msg)) //If the cookie is not found in the cookie list, it is a new user
        {
            listOfCookies.push(msg); //if the cookie isnt already in the list (New user)
            console.log("A new user connected with socket id: " + id);

            newUser = {
                cookie: msg,
                username: id,
                nameColor: 'FFFFFF',
                key: id,
            };

            listOfCookieUsers.push(newUser); //NEW

            listOfUsers.push(newUser);

            //console.log(listOfUsers);
            console.log(listOfCookieUsers);
            sendUserList(listOfUsers); //send the list of online users to the client to display 

            socket.emit('update messages', listOfMessages); //New user will get all of the previous messages from the chat

            socket.broadcast.emit('user join', newUser.username, newUser.nameColor); //on first join
            socket.emit('your info', newUser.username); //Tell you who you are, what username was given to you, and only you 
        }
        else //The cookie was found, and we need the get their user information
        {
            console.log("Returning user's cookie is: " + msg);
            
            socket.emit('update messages', listOfMessages); //returning user will get all of the previous messages from the chat

            //Add them as a user as well

            var match = 0;

            for (var i = 0; i < listOfCookieUsers.length; i++)
            {
                if (listOfCookieUsers[i].cookie == msg)
                {
                    for (var j = 0; j < listOfUsers.length; j++)
                    {
                        if (listOfCookieUsers[i].username == listOfUsers[j].username)
                        {
                            console.log("WE HAVE A MATCH WITH " + listOfUsers[j].username);
                            match = 1;
                        }
                    }

                    //else add user to list and send user list
                    if (match == 1)
                    {
                        //Keep the color 
                        //change the username to be the id 
                        var user = {
                            cookie: listOfCookieUsers[i].cookie,
                            username: id,
                            nameColor: listOfCookieUsers[i].nameColor,
                            key: id,
                        };

                        listOfUsers.push(user);

                        console.log(listOfUsers);

                        sendUserList(listOfUsers); //send the list of online users to the client to display

                        socket.emit('your info', user.username); //Welcome back instead?
                        //socket.emit('username taken', user.username);
                        socket.broadcast.emit('user join', user.username, user.nameColor); //For others to let them know who joined the room
                    }
                    else
                    {
                        var user = {
                            cookie: listOfCookieUsers[i].cookie,
                            username: listOfCookieUsers[i].username,
                            nameColor: listOfCookieUsers[i].nameColor,
                            key: listOfCookieUsers[i].key,
                        };
    
                        id = listOfCookieUsers[i].username; //update id for the list checker
    
                        listOfUsers.push(user);
    
                        console.log(listOfUsers);
    
                        sendUserList(listOfUsers); //send the list of online users to the client to display
    
                        //socket.emit('your info', listOfCookieUsers[i].username); //Welcome back instead?
                        socket.emit('welcome back', listOfCookieUsers[i].username);
                        socket.broadcast.emit('user join', listOfCookieUsers[i].username, listOfCookieUsers[i].nameColor); //For others to let them know who joined the room
                    }
                    
                }
            }

        }
    });

    socket.on('chat message', function(msg) 
    {
        msg.time = currentTime(); //get the current time for the message

        var index = compareID(id); //Compare the id with the username in order to get the index of the online user
        console.log("The user list index is: " + index);

        var cindex = compareCookies(listOfUsers[index].cookie); //Gives me the index the user is at to retrieve the cookie
        console.log(cindex);

        //check for the change of usernames and user color here
        if (msg.message.includes("/nickcolor"))
        {
            var split = msg.message.split(" "); //split the message to get the parts
            console.log(split);
            if (split[0] == "/nickcolor") //if the first part is /nickcolor 
            {
                //Check that the given colot isnt the same as backgrounds
                if ((split[1] == "808080") | (split[1] == "474747")) //CHANGE THIS IF I CHANGE THE BACKGROUND COLOR
                {
                    //console.log("NUH UH, thats the background color");
                    socket.emit('color error', ''); //give an error to client if user picks a background color
                }
                else //The user picked a valid color
                {
                    //console.log("Updating nick color to: " + split[1]); 
                    listOfUsers[index].nameColor = split[1]; //update the nameColor for the user
                    listOfCookieUsers[cindex].nameColor = split[1]; //Update the cookie as well
                    sendUserList(listOfUsers); //send the list of users to client to be updated with the chosen color
                    
                    socket.emit('name update', listOfUsers[index].username, listOfUsers[index].nameColor);
                }
            }
        }
        else if (msg.message.includes("/nick"))
        {
            var split = msg.message.split(" ");
            console.log(split);
            if ((split[0] == "/nick") & (split[1] != "")) 
            {
                if (!checkUsername(split[1], listOfUsers)) //Check to see if the name was taken already first??
                {
                    console.log(split[1]);
                    console.log("Changing nickname to: " + split[1]);
                    listOfUsers[index].username = split[1];
                    listOfCookieUsers[cindex].username = split[1]; //Update the cookies as well
                    id = split[1]; //change the id for the user checker
                    sendUserList(listOfUsers);

                    socket.emit('name update', listOfUsers[index].username, listOfUsers[index].nameColor); //on name change
                }
                else
                {
                    socket.emit('name error', split[1]); //send an error to the client that the name is already been chosen 
                }
            }
        }
        else 
        {
            msg.color = listOfUsers[index].nameColor;
            msg.user = listOfUsers[index].username;
            msg.index = index;
            //console.log("Sender was " + msg.user + " index of " + msg.index);
            listOfMessages.push(msg);
            io.emit('chat message', msg); //send the chat message to the client to display
        }
        
    });

    //When a user disconnects from the chat 
    socket.on('disconnect', function()
    {
        console.log('A User disconnected from the chat');
        var index = compareID(id);
        console.log(index);

        socket.broadcast.emit('user leave', listOfUsers[index].username, listOfUsers[index].nameColor); //on disconnect from chat

        listOfUsers.splice(index, 1);
        console.log("List right before updating on disconnect: " + listOfUsers);
        sendUserList(listOfUsers); //send a new updated list of users to the client to print out
    })
});

function compareCookies(id)
{
    for (var i = 0; i < listOfCookieUsers.length; i++)
    {
        if (listOfCookieUsers[i].cookie == id)
        {
            return i;
        }
    }
    return 0;
}

//function which checks if a cookie is in the list already, meaning they have visited the chat
function checkCookies(listOfCookies, msg)
{
    for (var i = 0; i < listOfCookies.length; i++)
    {
        if (listOfCookies[i] == msg)
        {
            return 1;
        }
    }
    return 0;
}

//Function to check the given username to see if it is the online users list
function checkUsername (newName, list) {
    for (var i = 0; i < list.length; i++)
    {
        if (list[i].username == newName)
        {
            return 1;
        }
    }
    return 0;
}

//Sends the updated user list to the client to display the online users
function sendUserList(list) {
    io.emit('update users', list); //update the users list of the client
}

//function to get the current time of message sent
function currentTime() {
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds(); //gets time in hours, minutes and seconds
    return time;
}

//Function to compare the id given to see if it matches one of the usernames
function compareID(id) {
    console.log("THE ID IS: " + id);
    for (var i = 0; i < listOfUsers.length; i++)
    {
        if (id == listOfUsers[i].username) //was username
        {
            return i;
        }
    }
    return -1;
}

