pool = require("../db.js");
//const fs = require('node:fs');
const azureStorage = require('../services/azure-storage.js');

let message_list = [];
let messageId = 0;
let message_limit = 20;
let drawing_width_limit = 1100;
let drawing_height_limit = 800;
let message_length_limit = 128;
let username_length_limit = 16;
let avatar_length_limit = 9 ** 2;

const Drawings = {

    async add(request){
      try{
        message = {
          avatar: JSON.parse(request.body.avatar),
          path: null,
          width: Number(request.body.width),
          height: Number(request.body.height),
          colorSpace: request.body.colorSpace,
          textMessage: request.body.textMessage,
          username: request.body.username,
          id: null
        };

        this.validate(message);

        if(request.file != undefined && await azureStorage.countImages() <= 20){
          message.path = await azureStorage.uploadImage(
              request.file.buffer,
              messageId.toString() + ".jpeg"
          );
        }

        if(message_list.length >= message_limit){
          message_list.splice(0, 1);
        }

        message.id = messageId++;

        message_list.push(message);
      }catch (error) {
        console.log(error)
        return error;
      }
    },

    async getAll(){
      try{
        //console.log("drawings-model.js Drawing list length while getting all: ", message_list.length)
        return message_list;
      } catch (error){
        return error;
      }
    },

    async getPastId(lastMessageId){
      try {
        return message_list.filter(message => message.id > lastMessageId);
      } catch (error) {
        return error; 
      }
    },

    validate(message){
      try {
        //Check drawing data is correct
        if(message == null){
          throw("Drawing is null");
        }

        if(typeof message.width != "number" || typeof message.height != "number" || message.colorSpace != "string" || message.text_message != "string"){
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