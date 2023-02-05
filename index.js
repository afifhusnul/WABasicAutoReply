const {
    default: makeWASocket,
	MessageType, 
    MessageOptions, 
    Mimetype,
	DisconnectReason,
    useSingleFileAuthState
} =require("@adiwajshing/baileys");

const { Boom } =require("@hapi/boom");
const {state, saveState} = useSingleFileAuthState("./auth_info.json");
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const logger = require('morgan');

const express = require("express");
const bodyParser = require("body-parser");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");
const port = process.env.PORT || 8000;


app.use(express.json())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'));


//fungsi suara capital 
function capital(textSound){
    const arr = textSound.split(" ");
    for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }
    const str = arr.join(" ");
    return str;

}

async function connectToWhatsApp() {
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {
    	//console.log(update);
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        
        //console.log(messages);
        
        if(type === "notify"){

            if(!messages[0].key.fromMe) {

                //tentukan jenis pesan berbentuk text                
                const pesan = messages[0].message.conversation;

                //tentukan jenis pesan apakah bentuk list
                const responseList = messages[0].message.listResponseMessage;
                
                //tentukan jenis pesan apakah bentuk button
                const responseButton = messages[0].message.buttonsResponseMessage;

                //tentukan jenis pesan apakah bentuk templateButtonReplyMessage
                //const responseReplyButton = messages[0].message.templateButtonReplyMessage;
                
                //noWa dari pengirim pesan sebagai id
                const noWa = messages[0].key.remoteJid;


                await sock.readMessages([messages[0].key]);

                //kecilkan semua pesan yang masuk lowercase 
                const pesanMasuk = pesan.toLowerCase();

                if(!messages[0].key.fromMe && pesanMasuk === "ping" ){
                    await sock.sendMessage(noWa, {text: "Pong"},{quoted: messages[0] });
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "mb") {                    
                    await sock.sendMessage(noWa, {text: "Mercedes-Benz"});                    
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "list") {
                    const buttons = [
                        {buttonId: "id1", buttonText: {displayText: 'Customer Service'}, type: 1},
                        {buttonId: "id2", buttonText: {displayText: 'Dealer Locator!'}, type: 1},
                        {buttonId: "id3", buttonText: {displayText: '💵 Insurance Renewal'}, type: 1}
                    ]
                    const buttonInfo = {
                        text: "Service Menu",
                        buttons: buttons,
                        headerType: 1,
                        viewOnce: true,
                    }
                    await sock.sendMessage(noWa, buttonInfo, {quoted: messages[0]});
                    
                }
                else if(!messages[0].key.fromMe && responseButton){

                    //console.log(responseButton);
                    
                    if(responseButton.selectedButtonId == "id1"){
                        await sock.sendMessage(noWa, {
                            text:"The MB Customer Service hotline is +6012345678910. \nPlease feel free contact them personally http://wa.me/60123456789"
                        });  
                    }else if(responseButton.selectedButtonId == "id2"){
                        await sock.sendMessage(noWa, {
                            text:"You choose Dealer Locator! \nPlease type *Menu* and select the menu"
                        });  
                    }else if(responseButton.selectedButtonId == "id3"){
                        await sock.sendMessage(noWa, {
                            text:"Renew your car Insurance & get the rewards!, Please go to \nhttp://www.mercedes-benz.com.my for the details"
                        });  
                    }
                    else{
                        await sock.sendMessage(noWa, {
                            text: "Invalid menu"
                        });
                    } 
                    
                }      
                else if(!messages[0].key.fromMe && pesanMasuk === "img") {
                    await sock.sendMessage(noWa, { 
                        image: {
                            url:"./image/KopiJahe.jpeg"
                        },
                        caption:"Ini Kopi Jahe"
                    });
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "sound") {

                    textsound = capital("ini adalah pesan suara dari Robot Whastapp");

                    let API_URL = "https://texttospeech.responsivevoice.org/v1/text:synthesize?text="+textsound+"&lang=id&engine=g3&name=&pitch=0.5&rate=0.5&volume=1&key=0POmS5Y2&gender=male";
                    file = fs.createWriteStream("./sound.mp3");
                    const request = https.get(API_URL, async function(response) {
                        await response.pipe(file);
                        response.on("end",async function(){    
                            await sock.sendMessage(noWa, { 
                                audio: { 
                                    url: "sound.mp3",
                                    caption: textsound 
                                }, 
                                mimetype: 'audio/mp4'
                            });
                        });
                    });
                }
                 else if(!messages[0].key.fromMe && pesanMasuk === "menu") {

                    const jenismenu = [{
                            title : 'Dealer List', 
                            rows :[
                                {
                                    title: "Hapseng Star",
                                    rowId: '1'
                                }, 
                                {
                                    title: "Cycle & Carriage Bintang",
                                    rowId: '2'
                                },
                                {
                                    title: "Asbenz Motor Sdn Bhd",
                                    rowId: '3'
                                }
                            ]
                    },
                    {
                        title : 'Car List', 
                        rows :[
                            {
                                title: "Mercedes Benz",
                                rowId: '4'
                            }, 
                            {
                                title: "Maybach",
                                rowId: '5'
                            },
                            {
                                title: "AMG",
                                rowId: '6'
                            },
                            {
                                title: "Mercedes EQ",
                                rowId: '7'
                            }
                        ]
                    }]

                    const listPesan = {
                        text: "Available menu for you",
                        title: "Menu List",
                        buttonText: "Show the menu",
                        viewOnce: true,
                        sections : jenismenu
                    }
                    
                    await sock.sendMessage(noWa, listPesan, {quoted: messages[0]});
                }              
                else if (!messages[0].key.fromMe && responseList){

                    //cek row id yang dipilih 
                    const pilihanlist = responseList.singleSelectReply.selectedRowId;
                    
                    if(pilihanlist == 1) {
                        await sock.sendMessage(noWa, { text: "Hapseng Star \nKompleks Auto World, Jalan Perusahaan, \nJuru Interchange 1798-A 13600 \nPerai, Penang "});
                    }
                    else if (pilihanlist == 2) {
                        await sock.sendMessage(noWa, { text: "Cycle & Carriage Bintang \nLot G.01 Ground Floor, Plaza Shell, \n29 Jalan Tunku Abdul Rahman 88000 \nKota Kinabalu, Sabah"});
                    }
                    else if (pilihanlist == 3) {
                        await sock.sendMessage(noWa, { text: "Asbenz Motor Sdn Bhd \nJalan Fairuz 6, Taman Perusahaan Ringan Bakar Arang 60 \n08000 Sungai Petani, \nKedah Darul Aman"});
                    }
                    else if (pilihanlist == 4) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/mb.png"
                            },
                            caption:"Mercedes A-Class"
                        });
                    }
                    else if (pilihanlist == 5) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/maybach.png"
                            },
                            caption:"Mercedes S-Class Maybach"
                        });
                    }
                    else if (pilihanlist == 6) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/amg.png"
                            },
                            caption:"Mercedes AMG"
                        });
                    }
                    else if (pilihanlist == 7) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/eq.png"
                            },
                            caption:"Mercedes EQ"
                        });
                    }
                    else{
                        await sock.sendMessage(noWa, {text: "Invalid Menu!"},{quoted: messages[0] });
                    }    
                }
                else{
                    await sock.sendMessage(noWa, {text: "Please start this Bot! Start with \n*Menu* or \n*List*"},{quoted: messages[0] });
                }

            }

        }

    });

}

// run in main file
connectToWhatsApp()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, () => {
  console.log("Server Berjalan pada Port : " + port);
});
