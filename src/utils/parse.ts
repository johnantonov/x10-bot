import { resolve } from "path"
import { ConnectionCallbackData } from "../dto/buttons"
import { Connection } from "../../database/models/connections"

export const getPath = (imageName: string) => {
  return resolve(__dirname, `../../../public/messageImages/${imageName}`)
}

export const parseConnectionData = (data: string): ConnectionCallbackData => {
  const newData = data.split('?')
  return {
    mn: newData[0],
    ss: newData[1],
    sts: newData[2],
    an: newData[3],
  }
}

export const newConnectionData = (data: ConnectionCallbackData): string => {
  return data.ss + "?" + data.sts
}

export const getFormatConnections = (connections: Connection[]) => {
  const ssToChatIds = connections.reduce((acc: { [key: string]: number[] }, row) => {
    if (acc[row.ss]) {
      acc[row.ss].push(row.chat_id);
    } else {
      acc[row.ss] = [row.chat_id];
    }
  
    return acc;
  }, {});
  
  console.log(ssToChatIds);
  return ssToChatIds
}