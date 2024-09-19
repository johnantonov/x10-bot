import { resolve } from "path"

interface ConnectionCallbackData {
  main: string
  ss: string
  status: string
  action: string
}

export const getPath = (imageName: string) => {
  return resolve(__dirname, `../../../public/messageImages/${imageName}`)
}

export const parseConnectionData = (data: string): ConnectionCallbackData => {
  const newData = data.split('SPLIT')
  return {
    main: newData[0],
    ss: newData[1],
    status: newData[2],
    action: newData[3],
  }
}

export const newConnectionData = (data: ConnectionCallbackData): string => {
  return data.ss + "SPLIT" + data.status + "SPLIT" + data.action
}
