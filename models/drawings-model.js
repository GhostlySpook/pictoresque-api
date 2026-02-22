const dbConfig = require("../db.js");
const sql = require('mssql');
const crypto = require('crypto');
global.crypto = crypto;
//const fs = require('node:fs');
const azureStorage = require('../services/azure-storage.js');

let message_list = [];
let lastKnownId = 0;
let drawing_width_limit = 1100;
let drawing_height_limit = 800;
let message_length_limit = 128;
let username_length_limit = 16;
let avatar_length_limit = 811;
let hexRegex = /^#[A-f0-9]{6}$/;
let messages_in_memory = 20;

async function getLastMessages(){
  try{
    //Get last 20 messages on wakeup
    await sql.connect(dbConfig);
    let received_message_list = await sql.query("SELECT * FROM (SELECT TOP " + messages_in_memory.toString() + " * FROM [dbo].[user-messages] ORDER BY message_id DESC) AS sub_query ORDER BY message_id ASC")
    await sql.close();
    recordset = received_message_list.recordset;

    //Get the last known id
    let length = recordset.length
    lastKnownId = Number(recordset[length - 1].message_id)

    //Fill message list
    for(let i = 0; i < recordset.length; i++){
      record = recordset[i];

      let adding_width = null;
      let adding_height = null;

      if(record.width != null && record.height != null){
        adding_width = Number(record.width)
        adding_height = Number(record.height)
      }

      message_list.push({
        message_id: Number(record.message_id),
        avatar: record.avatar,
        path: record.path,
        width: adding_width,
        height: adding_height,
        textMessage: record.textMessage,
        username: record.username
      });
    }

    console.log("Got " + length.toString() + " messages")
  }
  catch(error){
    console.log("Problem getting the last messages", error)
    sql.close()
  }
}

async function getLastMessage(){
  try{
    //Get last message ID on wakeup
    await sql.connect(dbConfig);
    last_message = await sql.query("SELECT TOP 1 * FROM [dbo].[user-messages] ORDER BY message_id DESC")
    await sql.close();

    let message_record = last_message.recordset[0];

    let adding_width = null;
    let adding_height = null;

    if(message_record.width != null && message_record.height != null){
      adding_width = Number(message_record.width)
      adding_height = Number(message_record.height)
    }

    message_list.push({
      message_id: message_record.message_id,
      avatar: message_record.avatar,
      path: message_record.path,
      width: adding_width,
      height: adding_height,
      textMessage: message_record.textMessage,
      username: message_record.username
    });

    lastKnownId = message_record.message_id;
    
    if(message_list.length > 20){
      message_list.shift();
    }
  }
  catch(error){
    console.log("Problem getting last id", error)
    sql.close()
  }
}

/*async function getLastId(){
  try{
    //Get last message ID on wakeup
    await sql.connect(dbConfig);
    let last_row = await sql.query("SELECT max(message_id) as message_id FROM [dbo].[user-messages]")
    await sql.close();
    lastKnownId = Number(last_row.recordset[0].message_id)
  }
  catch(error){
    console.log("Problem getting last id", error)
    sql.close()
  }
}*/

getLastMessages();

const Drawings = {

    async add(req){
      try{
        let adding_width = null;
        let adding_height = null;

        if(req.body.width != null && req.body.height != null){
          adding_width = Number(req.body.width)
          adding_height = Number(req.body.height)
        }

        message = {
          avatar: req.body.avatar,
          path: null,
          width: adding_width,
          height: adding_height,
          textMessage: req.body.textMessage,
          username: req.body.username
          //id: null
        };

        this.validate(message);

        if(req.file != undefined && await azureStorage.countImages() <= 20){
          message.path = await azureStorage.uploadImage(
              req.file.buffer,
              crypto.randomUUID() + ".jpeg"
          );
        }

        await sql.connect(dbConfig);

        // Create a new request
        const request = new sql.Request();

        // Add the parameter with its SQL data type (e.g., sql.Int)
        request.input('avatar', sql.VarChar, message.avatar);
        request.input('path', sql.VarChar, message.path);
        request.input('width', sql.Int, message.width);
        request.input('height', sql.Int, message.height);
        request.input('textMessage', sql.VarChar, message.textMessage);
        request.input('username', sql.VarChar, message.username);

        const result = await request.execute("SaveMessage")

        await sql.close()

        console.log(result);

        await getLastMessage();
      }catch (error) {
        console.log(error)
        sql.close()
        return error;
      }
    },

    getAll(){
      try{
        console.log("Sending all messages");
        return message_list;
      } catch (error){
        sql.close()
        return error;
      }
    },

    async getAllSQL(){
      try{
        //console.log("drawings-model.js Drawing list length while getting all: ", message_list.length)
        await sql.connect(dbConfig);

        const result = await sql.query("SELECT * FROM [dbo].[user-messages]")

        await sql.close()

        //return message_list;
        return result;
      } catch (error){
        sql.close()
        return error;
      }
    },

    getPastId(lastMessageId){
      try{
        console.log("Sending messages after " + lastMessageId.toString())
        return message_list.filter(message => message.message_id > lastMessageId);
      }
      catch(error){
        return error
      }
    },

    async getPastIdSQL(lastMessageId){
      try {
        if(lastMessageId >= lastKnownId){
          console.log("Client asking is already updated");
          return
        }

        //return message_list.filter(message => message.id > lastMessageId);
        await sql.connect(dbConfig);

        const request = new sql.Request();

        // Add the parameter with its SQL data type (e.g., sql.Int)
        request.input('id', sql.Int, lastMessageId);

        const result = await request.query("SELECT * FROM [dbo].[user-messages] WHERE message_id > @id")

        await sql.close()

        console.log("Closing connection");

        return result
      } catch (error) {
        sql.close()
        return error; 
      }
    },

    validate(message){
      //Check drawing data is correct
      if(message == null){
        throw("Drawing is null");
      }

      if((message.path != null && (typeof message.width != "number" || typeof message.height != "number"))
        || !(typeof message.text_message == "string" || message.text_message == null)){
        throw("Type of field isn't correct");
      }

      //Check the drawing received isn't too big
      if(message.width > drawing_width_limit || message.height > drawing_height_limit){
        throw("Drawing size is too big");
      }

      //Check text message isn't too big
      if(message.textMessage.length > message_length_limit){
        throw("Text message is too long");
      }

      //Check text message isn't too big
      if(message.username.length > username_length_limit){
        throw("Username is too long");
      }

      if(message.avatar.length > avatar_length_limit)
        throw("Avatar data is too big");

      let avatarListLength = message.avatar.length;
      for(let i = 0; i < avatarListLength; i++){
        let avatarColor = message.avatar[i];

        if(!hexRegex.test(avatarColor)){
          throw("Avatar color is invalid:", avatarColor)
        }
      }
    }
  
}; 

module.exports = Drawings;