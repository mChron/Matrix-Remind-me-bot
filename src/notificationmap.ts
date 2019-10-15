export class NotificationMap extends Map<string, Notification[]> {
    addNotification(sender:string, message:string, delay:number, timer:NodeJS.Timer, isInterval:boolean) {
        if (!this.has(sender)) {
            this.set(sender, []);
        }
        const userArray = this.get(sender)!
        userArray.push({
            timer,
            message,
            timeout: delay,
            passed: false,
            interval: isInterval
        })
        this.set(sender, userArray)
        return userArray.length - 1
    }

    removeNotification(sender:string, timerNumber:number) {
        if (!this.has(sender)) {
            return;
        }
        const userArray = this.get(sender)!
        if (userArray.length < timerNumber) {
            return;
        }
        const [notif] = userArray.splice(timerNumber-1, 1)
        if (userArray.length === 0) {
            this.delete(sender)
        }
        else {
            this.set(sender, userArray)
        }
        return notif;
    }

    flagNotificationPassed(sender:string, timerNumber:number, truth:boolean) {
        console.log("Entered flagNotificationPassed")
        if (!this.has(sender)) {
            return;
        }
        const userArray = this.get(sender)!
        console.log(userArray)
        if (userArray.length < timerNumber) {
            return;
        }
        userArray[timerNumber]["passed"] = truth
    }
}

interface Notification {
    timer:NodeJS.Timer,
    message: string,
    timeout: number,
    passed: boolean,
    interval: boolean
}