const dbConfig = require("../db.js");
const sql = require('mssql');
const crypto = require('crypto');
global.crypto = crypto;
//const fs = require('node:fs');
const azureStorage = require('../services/azure-storage.js');

let message_list = [];
let lastKnownId = 0;
let message_limit = 20;
let drawing_width_limit = 1100;
let drawing_height_limit = 800;
let message_length_limit = 128;
let username_length_limit = 16;
let avatar_length_limit = 811;

async function getLastId(){
  try{
    //Get last message ID on wakeup
    await sql.connect(dbConfig);
    let last_row = await sql.query("SELECT max(message_id) as message_id FROM [dbo].[user-messages]")
    lastKnownId = Number(last_row.recordset[0].message_id)
    await sql.close();
  }
  catch(error){
    console.log("Problem getting last id", error)
    sql.close()
  }
}

getLastId();

const Drawings = {

    async add(req){
      try{
        message = {
          avatar: req.body.avatar,
          path: null,
          width: Number(req.body.width),
          height: Number(req.body.height),
          textMessage: req.body.textMessage,
          username: req.body.username
          //id: null
        };

        this.validate(message);

        message.width = Number(message.width)
        message.height = Number(message.height)

        if(req.file != undefined && await azureStorage.countImages() <= 20){
          message.path = await azureStorage.uploadImage(
              req.file.buffer,
              crypto.randomUUID() + ".jpeg"
          );
        }

        /*if(message_list.length >= message_limit){
          message_list.splice(0, 1);
        }*/



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

        getLastId();

        //message.id = messageId++;

        //message_list.push(message);


      }catch (error) {
        console.log(error)
        sql.close()
        return error;
      }
    },

    async getAll(){
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

    async getPastId(lastMessageId){
      try {
        if(lastMessageId >= lastKnownId){
          return
        }

        //return message_list.filter(message => message.id > lastMessageId);
        await sql.connect(dbConfig);

        const request = new sql.Request();

        // Add the parameter with its SQL data type (e.g., sql.Int)
        request.input('id', sql.Int, lastMessageId);

        const result = await request.query("SELECT * FROM [dbo].[user-messages] WHERE message_id > @id")

        await sql.close()

        return result
      } catch (error) {
        sql.close()
        return error; 
      }
    },

    validate(message){
      try {
        //Check drawing data is correct
        if(message == null){
          throw("Drawing is null");
        }

        if(typeof message.width != "number" || typeof message.height != "number" || message.text_message != "string"){
          throw("Type of field isn't correct");
        }

        //Check the drawing received isn't too big
        if(message.width > drawing_width_limit || message.height > drawing_height_limit){
          throw("Drawing size is too big");
        }

        //Check text message isn't too big
        if(message.textMessage > message_length_limit){
          throw("Text message is too long");
        }

        //Check text message isn't too big
        if(message.username > username_length_limit){
          throw("Username is too long");
        }

        if(message.avatar.length > avatar_length_limit)
          throw("Avatar data is too big");

        //TODO Check that avatar data within all is string and doesn't go over the limit of characters

      } catch (error) {
        return error;
      }
    }
  
}; 

module.exports = Drawings;