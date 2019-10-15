import {
    MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, RichReply
} from "matrix-bot-sdk"
import markdown from "markdown-it"
import _ts from "timestring"
import { NotificationMap } from "./notificationmap";
import fs from "fs"
const timestring: (timestring: string, format: "ms") => number = _ts;
const md = markdown({});
class notif_bot {
    private client!: MatrixClient
    private notifMap: NotificationMap = new NotificationMap()
    async main() {
        console.log("Its working")
        const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
        // where you would point a client to talk to a homeserver
        const homeserverUrl = config.homeserver;

        // see https://t2bot.io/docs/access_tokens
        const accessToken = config.accesstoken;

        // We'll want to make sure the bot doesn't have to do an initial sync every
        // time it restarts, so we need to prepare a storage provider. Here we use
        // a simple JSON database.
        const storage = new SimpleFsStorageProvider("notif_bot.json");

        // Now we can create the client and set it up to automatically join rooms.
        this.client = new MatrixClient(homeserverUrl, accessToken, storage);
        AutojoinRoomsMixin.setupOnClient(this.client);

        // We also want to make sure we can receive events - this is where we will
        // handle our command.
        this.client.on("room.message", (roomId, event)=> {
            this.handleCommand(roomId, event);
        });

        this.client.on("room.join", (roomId)=> {
            this.joinMessage(roomId);
        })

        // Now that the client is all set up and the event handler is registered, start the
        // client up. This will start it syncing.
        await this.client.start();

    }

    // send a message when initially joining a room
    async joinMessage(roomId:string) {
      const replyBody = `
*All commands are case insensitive, but require the first char to be an exclamation !*\n\n
**!(setreminder|remindme)**: make a reminder. Usage: !setreminder <time><unit> <message>, e.g. !setreminder 5m Check the kettle or !remindme 5m Check the kettle\n
**!resetreminder**: reset a (non-interval) reminder. Usage: !resetreminder <index>, e.g. !resetreminder 2\n
**!setinterval**: make a reminder that runs on an interval. Usage: !setinterval <time><unit> <message>\n
**!(list|checkreminder[s])**: check reminder status. Usage: !checkreminder or !checkreminders or !list\n
**!cancelreminder**: cancel your reminder. Usage: !cancelreminder <index>, e.g. !cancelreminder 2\n
**!(clearinactive|prune)**: clear your inactive reminders. Usage: !clearinactive or !prune\n
**!(cancel|clear)all**: cancel all of your reminders. Usage: !cancelall or !clearall
`
      const replyBodyHtml = md.render(replyBody);
      const reply = {}
      reply["msgtype"] = "m.notice"
      reply["body"] = replyBody
      reply["formatted_body"] = replyBodyHtml
      reply["format"] = "org.matrix.custom.html"
      await this.client.sendMessage(roomId, reply)
    }

    // This is our event handler for dealing with the `!hello` command.
    async handleCommand(roomId:string, event:any) {
        // Don't handle events that don't have contents (they were probably redacted)
        if (!event["content"]) return;

        // Don't handle non-text events
        if (event["content"]["msgtype"] !== "m.text") return;

        // We never send `m.text` messages so this isn't required, however this is
        // how you would filter out events sent by the bot itself.
        if (event["sender"] === await this.client.getUserId()) return;

        // Make sure that the event looks like a command we're expecting
        const body: string = event["content"]["body"];

        if (!body) return;
        const commandArgs = body.split(" ");
        const command = commandArgs[0];
        if ((/[!](setreminder|remindme)/i).test(command)) {
            const message = commandArgs.slice(2).join(" ");
            await this.setreminder(roomId, event, commandArgs[1], message);
        } else if ((/[!]resetreminder/i).test(command)) {
            await this.resetreminder(roomId, event, commandArgs[1])
        } else if ((/[!](list|checkreminder[s]?)/i).test(command)) {
            await this.checkreminder(roomId, event)
        } else if ((/[!]cancelreminder/i).test(command)) {
            await this.cancelreminder(roomId, event, commandArgs[1])
        } else if ((/[!]help/i).test(command)) {
            await this.help(roomId, event)
        } else if ((/[!]setinterval/i).test(command)) {
            const message = commandArgs.slice(2).join(" ");
            await this.intervalreminder(roomId, event, commandArgs[1], message);
        } else if ((/[!](cancel|clear)all/i).test(command)) {
            await this.cancelall(roomId, event)
        } else if ((/[!](clearinactive|prune)/i).test(command)) {
            await this.clearinactive(roomId, event)
        }


    }
    async setreminder(roomId:string, event:any, timeString: string, message: string) {
        const millisecondsDelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${millisecondsDelay}ms`
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply)
        const myTimeout = setTimeout(this.reminderActivated.bind(this, roomId, event, message), millisecondsDelay) // send the msg after timeout
        let timerIndex = this.notifMap.addNotification(event.sender, message, millisecondsDelay, myTimeout, false) // add to map for reference
        setTimeout(this.updateNotifStatus.bind(this, event, timerIndex, this.notifMap, true), millisecondsDelay)
    }
    async intervalreminder(roomId:string, event:any, timeString:string, message:string) {
        const msdelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded every ${msdelay}ms`
        const reply = RichReply.createFor(roomId,event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
        const myInterval = setInterval(this.reminderActivated.bind(this, roomId, event, message), msdelay)
        this.notifMap.addNotification(event.sender, message, msdelay, myInterval, true)
    }
    async resetreminder(roomId:string, event:any, timerNumber:string) {
        let replyBody = "You have a bug"
        let timerNum = parseInt(timerNumber)
        if (this.notifMap.has(event.sender)) {
            // get timer info
            let userNotifs = this.notifMap.get(event.sender)
            if (userNotifs) {
                const timer = userNotifs[timerNum - 1]
                if (timer) {
                    const millisecondsDelay = timer.timeout;
                    const replyBody = `Your reminder has been reset. You will be reminded in ${millisecondsDelay}ms`
                    const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
                    reply["msgtype"] = "m.notice";

                    //queue message
                    await this.client.sendMessage(roomId, reply)

                    // set timer based on previous information
                    const myTimeout = setTimeout(this.reminderActivated.bind(this, roomId, event, timer.message), millisecondsDelay) // send the msg after timeout
                    // remove old timer
                    const oldTimer = this.notifMap.removeNotification(event.sender, timerNum)
                    if (oldTimer) {
                        this.clearTimer(oldTimer)
                    }
                    // set new timer
                    let timerIndex = this.notifMap.addNotification(event.sender, timer.message, millisecondsDelay, myTimeout, false) // add to map for reference
                    setTimeout(this.updateNotifStatus.bind(this, event, timerIndex, this.notifMap, true), millisecondsDelay)
                } else {
                    replyBody = "Couldn't find reminder"
                }
            }
        } else {
            replyBody = "You have no reminders at the moment"
        }
    }
    async checkreminder(roomId:string, event:any) {
        let replyBody = "You have a bug"
        let msg = ""
        if (this.notifMap.has(event.sender)) {
            const timers = this.notifMap.get(event.sender)!;
            replyBody = `You have the following reminder(s) going: `
            let timerIndex = 1;
            for (const timer of timers) {
                msg = `<br/>${timerIndex} - `
                if (timer.passed) {
                    msg += "(inactive) "
                }
                else if (timer.interval) {
                    msg += "(interval) "
                }
                msg += `${timer.message}`
                replyBody += msg
                timerIndex += 1
            }
        } else {
            replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async cancelreminder(roomId:string, event:any, timerNumber:string) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.removeNotification(event.sender, parseInt(timerNumber))
            if (timer ) {
                this.clearTimer(timer)
                replyBody = "Your reminder has been removed"
            } else {
                replyBody = "Couldn't find reminder"
            }
        } else {
          replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async clearTimer(timer:any) {
        if (timer ) {
            if (timer.interval) {
                console.log("clearing interval for " + timer.message)
                clearInterval(timer.timer)
            }
            else {
                console.log("clearing regular for " + timer.message)
                clearTimeout(timer.timer)
            }
        }
    }
    async cancelall(roomId:string, event:any) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender) && this.notifMap.get(event.sender)) {
            let numOfNotifs = this.notifMap.get(event.sender)!.length
            for (let x = 0; x < numOfNotifs; x++) {
                let timer = this.notifMap.removeNotification(event.sender, 0)
                this.clearTimer(timer)
            }
            replyBody = "All of your reminders have been removed"
        } else {
          replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async clearinactive(roomId:string, event:any) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            let activeReminders:any[] = [];
            let userNotifs = this.notifMap.get(event.sender)
            if (userNotifs) {
                activeReminders = userNotifs.filter(function(notif) {
                  return !notif.passed;
                });
                this.notifMap.set(event.sender, activeReminders)
            }
            replyBody = "All inactive reminders have been removed"
        } else {
          replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async help(roomId:string, event:any) {
        const replyBody = `
*All commands are case insensitive, but require the first char to be an exclamation !*\n\n
**!(setreminder|remindme)**: make a reminder. Usage: !setreminder <time><unit> <message>, e.g. !setreminder 5m Check the kettle or !remindme 5m Check the kettle\n
**!resetreminder**: reset a (non-interval) reminder. Usage: !resetreminder <index>, e.g. !resetreminder 2\n
**!setinterval**: make a reminder that runs on an interval. Usage: !setinterval <time><unit> <message>\n
**!(list|checkreminder[s])**: check reminder status. Usage: !checkreminder or !checkreminders or !list\n
**!cancelreminder**: cancel your reminder. Usage: !cancelreminder <index>, e.g. !cancelreminder 2\n
**!(clearinactive|prune)**: clear your inactive reminders. Usage: !clearinactive or !prune\n
**!(cancel|clear)all**: cancel all of your reminders. Usage: !cancelall or !clearall
`
        const replyBodyHtml = md.render(replyBody);
        const reply = RichReply.createFor(roomId, event, replyBody, replyBodyHtml)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)

    }
    async reminderActivated(roomId:string, event:any, message) {
        const replyBody = `REMINDER: ${message}`
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async updateNotifStatus(event:any, timerIndex:number, notifMap:NotificationMap, truth:boolean) {
        console.log("Entered updateNotifStatus")
        await notifMap.flagNotificationPassed(event.sender, timerIndex, truth)
    }
}
new notif_bot().main().then(() => {
    console.log("It has started")
})

