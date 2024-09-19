import { resolve } from "path"
import { ConnectionCallbackData } from "../dto/buttons"

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
