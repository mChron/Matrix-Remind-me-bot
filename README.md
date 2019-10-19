# Matrix-Remind-me-bot
*forked from [joakimvonanka/Matrix-Remind-me-bot](https://github.com/joakimvonanka/Matrix-Remind-me-bot)*

A [Matrix](https://matrix.org) bot using
[matrix-bot-sdk](https://github.com/turt2live/matrix-js-bot-sdk) to send
reminders to users.

## Additional/Modified Features
* Case insensitive commands
* Additional commands
    * cancelall - Cancell all reminders
    * resetreminder - Allows you to reset an inactive, non-interval reminder
    * clearinactive - Allows you to clear out inactive, non-interval reminders
* Added join message to print command usage when joining a room
* Formatting of checkreminder output
    * Indication of inactive (passed) reminders in checkreminder output
    * Indication of interval reminders in checkreminder output
* Removed cancelinterval command and overloaded cancelReminder
* Added alternative command names/formats

## Interacting With The Bot
*All commands are case insensitive, but require the first char to be an exclamation !*
1. Invite the bot to a private chat, the bot should send you a message on join with command usage info
* **!(setreminder|remindme)**: make a reminder. Usage: !setreminder <time><unit> <message>, e.g. !setreminder 5m Check the kettle or !remindme 5m Check the kettle
* **!resetreminder**: reset a (non-interval) reminder. Usage: !resetreminder <index>, e.g. !resetreminder 2
* **!setinterval**: make a reminder that runs on an interval. Usage: !setinterval <time><unit> <message>
* **!(list|checkreminder[s])**: check reminder status. Usage: !checkreminder or !checkreminders or !list
* **!cancelreminder**: cancel your reminder. Usage: !cancelreminder <index>, e.g. !cancelreminder 2
* **!(clearinactive|prune)**: clear your inactive reminders. Usage: !clearinactive or !prune
* **!(cancel|clear)all**: cancel all of your reminders. Usage: !cancelall or !clearall

## Installation

1. `git clone https://github.com/joakimvonanka/Matrix-Remind-me-bot.git`
2. `cd /Matrix-Remind-me-bot.git`
3. `npm install`
4. `npm run build`


## Configuration

1. Create a `config.json` file in the root directory.
2. In the config.json paste this in:

```
{
    "accesstoken":"",
    "homeserver":""
}
```

3. Add your access token in the `""`, and the same for the homeserver url.
   1. To obtain your access token login with the credentials for your bot
   2. Expand user settings > Help & About > Advanced > `Access Token: <click to reveal>`
4. To run the bot type `npm start`

## Pulling/Building The Docker Image
**The docker image is available on [docker hub](https://hub.docker.com/u/mchron/)**
* `docker pull mchron/matrix_remind_me_bot:latest`
* `docker build -t matrix-remind-me-bot:latest ./`
* If you have Gnu Make
    * ```make docker```

## Docker Configuration
1. Map your config.json to /app/config.json
    1. `./config.json:/app/config.json:ro`
2. Map a local directory or named volume for sync file
    1. `./notif_bot.js:/app/notif_bot.json`
3. If you're self hosting and you have your own ssl certs map those in
    1. `./something.pem:/etc/certs/something.pem:ro`

## Creating/Running The Docker Container
* Docker run

    ```docker run -d -v $(pwd)/config.json:/app/config.json:ro -v $(pwd)/notif_bot.js/app/notif_bot.json:rw --name mtx-reminder-bot mchron/matrix_remind_me_bot:latest```
* Docker-compose
    ```
    mtx-reminder-bot:
      image: mchron/matrix_remind_me_bot:latest
      volumes:
        - ./config.json:/app/config.json:ro
        - ./notif_bot.js:/app/notif_bot.json:rw
    ```
