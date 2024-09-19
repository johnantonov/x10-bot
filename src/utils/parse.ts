import { resolve } from "path"

export const getPath = (imageName: string) => {
  return resolve(__dirname, `../../../public/messageImages/${imageName}`)
}

export const parseCallbackData = (data: string, type: 'connection' | 'report_time' ) => {
  switch (type) {
    case 'connection':
      const newData = data.split('_')
      return [newData[1], newData[2]]
  
    default:
      return []
  }
}
