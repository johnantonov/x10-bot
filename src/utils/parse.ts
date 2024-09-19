import { resolve } from "path"
import { ConnectionCallbackData } from "../dto/buttons"


export const getPath = (imageName: string) => {
  return resolve(__dirname, `../../../public/messageImages/${imageName}`)
}

export const parseConnectionData = (data: string): ConnectionCallbackData => {
  const newData = JSON.parse(data)
  // return {
  //   main: newData[0],
  //   ss: newData[1],
  //   status: newData[2],
  //   action: newData[3],
  // }
  return newData
}

export const newConnectionData = (data: ConnectionCallbackData): string => {
  return JSON.stringify(data)
}
