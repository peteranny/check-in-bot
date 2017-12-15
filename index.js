const { MessengerBot, MongoSessionStore } = require('bottender');
const { createServer } = require('bottender/express');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/checkin';
const config = require('./bottender.config.js').messenger;

const bot = new MessengerBot({
  accessToken: process.env.accessToken || config.accessToken,
  appSecret: process.env.appSecret || config.appSecret,
  sessionStore: new MongoSessionStore(MONGODB_URI),
});

const { getLocation, getTimeStamp, getImageUrl } = require('./utils');

const quickReply = {
  quick_replies: [
    {
      content_type: 'text',
      title: '做功德',
      payload: 'CHECK_IN',
    },
    {
      content_type: 'text',
      title: '不做了',
      payload: 'CHECK_OUT',
    },
    {
      content_type: 'location',
      title: '傳送位置',
      payload: 'SEND_LOCATION',
    },
  ],
};

bot.setInitialState({
  isWorking: false,
  startTime: null,
  endTime: null,
  location: null,
  locationTimestamp: null,
  imgUrls: [],
});

bot.onEvent(async context => {
  console.log(context._session._id);
  if (context.event.isText) {
    console.log('isText:', context.event.text);
    switch (context.event.text) {
      case '做功德':
        if (context.state.isWorking) {
          await context.sendText('你已經在做功德了！', quickReply);
        } else {
          context.setState({ isWorking: true, startTime: new Date() });
          console.log('after setting state:', context.state);
          await context.sendText('哈庫納罵踏踏！！ 你的功德正在源源不絕地產生中，你感覺到了嗎？', quickReply);
        }
        break;
      case '不做了':
        if (context.state.isWorking) {
          context.setState({ isWorking: false, endTime: new Date() });
          console.log('after setting state:', context.state);
          const time = context.state.endTime - context.state.startTime;
          await context.sendText(`你今天總共生產了${time}單位的功德，台灣因為有你的功德而美好。休息一下，明天再來吧。所有功德已存到台灣海量功德大數據資料庫。`, quickReply);
        } else {
          await context.sendText('You havent check in', quickReply);
        }
        break;
      default:
        await context.sendText(`${context.event.text}`);
    }
  } else if (context.event.isLocation && context.event.hasAttachment) {
    console.log('isLocation && hasAttachments:', getLocation(context), getTimeStamp(context));
    if (context.state.isWorking) {
      context.setState({ location: getLocation(context), locationTimestamp: getTimeStamp(context)});
      console.log('after setting state:', context.state);
    }
  } else if (context.event.isPostback) {
    console.log('isPostback:', context.event.postback);
  } else if (context.event.isImage && context.event.hasAttachment) {
    console.log('isImage:', getImageUrl(context), getTimeStamp(context));
    if (context.isWorking) {
      context.setState({ imgUrls: context.state.imgUrls.concat([getImageUrl(context)]) });
      console.log('after setting state:', context.state);
    }
  }
});

const server = createServer(bot, {
  verifyToken: process.env.verifyToken || config.verifyToken,
});

server.listen(PORT, () => {
  console.log(`server is running on ${PORT} port...`);
});
