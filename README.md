# RevisionDojo Archive

The RevisionDojo archive, hosted on https://rev-dojo-archive.pages.dev, is a one-to-one recreation of RevisionDojo with all its resources for 100% free. This includes all its questionbanks, notes, cheatsheets, and more. If you want to help out, please consider donating you RevisionDojo account (contact @notblack in the [PirateIB Discord](https://discord.pirateib.sh/).

## Running Locally

Make sure you have https://nodejs.org/ installed. To check if you already have it, enter `node -v` in your terminal (it should show some numbers). If you have trouble with this or any other instructions, don't hesitate to message @notblack on Discord. All this information is also in `HOW_TO_USE.txt`.

### PRODUCTION MODE
This is the best way to use the website. First you have to build the app, then run it.
To build it, simply cd into this folder and run these commands in your terminal:
```bash
(cd into this directory)
npm install
npm run build
npm run preview
```

### DEVELOPMENT MODE
This runs significantly slower, but if you want to edit any code in the app, use this to run it.
```bash
(cd into this directory)
npm install
npm run dev
```

## Roadmap Goals
If you don't know how to code a scraper, you can help us my donating a PRO account.
- Scraper for [Videos](https://www.revisiondojo.com/ib?view=videos) - may need a PRO account
- Scraper for [Lessons](https://www.revisiondojo.com/ib?view=learn)
- Scraper for [Exercises](https://www.revisiondojo.com/bootcamps)
- Scraper for [Vocabulary](https://www.revisiondojo.com/vocabulary-practice)
- [OnePrep](https://oneprep.xyz/) scraper (they have an relationship with RevisionDojo)
- Free AI for grading/etc.
- Any algorithms for tools that RevisionDojo provides