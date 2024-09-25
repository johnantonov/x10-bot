import { CallbackData } from "../components/botButtons";
import { CallbackAction } from "../dto/callback";


export class CallbackProcessor {
  private userCallbackData: string;

  constructor(userCallbackData: string) {
    this.userCallbackData = userCallbackData;
  }

  getAction(): CallbackAction {
    if (this.isMenuAction()) {
      return "menu";
    }
    
    if (this.isNewUserAction()) {
      return "new user";
    }

    if (this.myConnectionsMenu()) {
      return "my connection";
    }

    if (this.openConnection()) {
      return "open connection";
    }

    if (this.newConnection()) {
      return "new connection";
    }

    if (this.getReportNow()) {
      return "report now";
    }
    
    if (this.editReportProducts()) {
      return "edit products";
    }

    if (this.off()) {
      return "off";
    }

    if (this.returnConnection()) {
      return "return connection menu";
    }

    if (this.getAllReportsNow()) {
      return "get all reports";
    }

    if (this.changeTime()) {
      return "change time";
    }

    if (this.changeTitle()) {
      return "change title";
    }

    if (this.isEditMenuWithImg()) {
      return "img menu";
    }

    return null; // error
  }

  private isMenuAction(): boolean {
    return this.userCallbackData.startsWith(CallbackData.menu as string);
  }

  private isNewUserAction(): boolean {
    return this.userCallbackData === CallbackData.registrateUser
  }
  
  private myConnectionsMenu(): boolean {
    return this.userCallbackData === CallbackData.myConnections
  }

  private openConnection(): boolean {
    return this.userCallbackData.startsWith(CallbackData.connectionBtn as string)
  }
  
  private newConnection(): boolean {
    return this.userCallbackData === CallbackData.newConnection
  }
  
  private getReportNow(): boolean {
    return this.userCallbackData.startsWith(CallbackData.getReportNow as string)
  }

  private editReportProducts(): boolean {
    return this.userCallbackData.startsWith(CallbackData.editReportProducts as string)
  }

  private off(): boolean {
    return this.userCallbackData.startsWith(CallbackData.offConnection as string) || this.userCallbackData.startsWith(CallbackData.offTable as string)
  }

  private returnConnection(): boolean {
    return this.userCallbackData.startsWith(CallbackData.returnConnection as string)
  }

  private getAllReportsNow(): boolean {
    return this.userCallbackData === CallbackData.getAllReportsNow
  }

  private changeTime(): boolean {
    return this.userCallbackData.startsWith(CallbackData.changeTime as string)
  }

  private changeTitle(): boolean {
    return this.userCallbackData.startsWith(CallbackData.editConnectionTitle as string)
  }

  private isEditMenuWithImg(): boolean {
    return this.userCallbackData.startsWith(CallbackData.menuEditImg as string)
  }
}