import { resolve } from "path"

export const getPath = (imageName: string) => {
  return resolve(__dirname, `../../../public/messageImages/${imageName}`)
}

export const helloNewUserText = `Это телеграм бот для получения ежедневных отчетов по вашему кабинету из Системы 10X.\n\nДля начала работы зарегистрируйте вашу систему:`