import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

let win: BrowserWindow;

app.on('ready', createWindow)

app.on('activate', () => {
    // macOS specific close process
    if (win === null) {
        createWindow()
    }
})

// Quit when all windows are closed.  
app.on('window-all-closed', function () {

    // On macOS specific close process  
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// app.whenReady().then(() => {
//     protocol.registerSchemesAsPrivileged([
//         { scheme: "priviliged", privileges: { bypassCSP: true } },
//     ]);
// });

//GetFile
ipcMain.on('getFile', (event, filePath) => {
    //arg is the path to the json file
    const fileData = fs.readFileSync(filePath);
    win.webContents.send('getFileResponse', fileData);
})

//UpdateFile
ipcMain.on('updateJsonFile', (event, path, data) => {
    // const [path, data] = args;
    fs.writeFileSync(path, JSON.stringify(data));
    win.webContents.send('updateJsonFileResponse', path, data);
})

//GetFilesInDir
ipcMain.on('getFilesInDir', (event, dirPath) => {
    // const files = fs.readdirSync(__dirname) "C:\\Users\\vukku\\Documents"
    const files = fs.readdirSync(dirPath)
    win.webContents.send('getFilesInDirResponse', files)
})

//Parse movies folder
ipcMain.on('parseMovies', (event, moviesFolder) => {
    const videoExts = ["mp4"];
    const coverExts = ["png", "jpg", "jpeg"];
    const subExts = ["srt"];

    const folders = fs.readdirSync(moviesFolder);
    let movies = [];
    
    folders.forEach((folder)=>{
        let folderPath = moviesFolder + "\\" + folder;
        movies.push({
            name: folder,
            folderPath: folderPath,
            videoPath: folderPath + "\\" + findFile(folderPath, videoExts),
            posterPath: folderPath + "\\" + findFile(folderPath, coverExts),
            subs: folderPath + "\\" + findFile(folderPath, subExts)
        })
    });

    win.webContents.send('parseMoviesResponse', movies)
});

//Parse media folder
ipcMain.on('parseMedia', (event, mediaFolders) => {
    const [ moviesFolder, tvSeriesFolder ] = mediaFolders;
    const videoExts = ["mp4", "mkv"];
    const coverExts = ["png", "jpg", "jpeg"];
    const subExts = ["srt"];

    let movies = parseMovies(moviesFolder, videoExts, coverExts, subExts);
    let tvSeries = parseTvSeries(tvSeriesFolder, videoExts, coverExts, subExts);

    win.webContents.send('parseMediaResponse', [ movies, tvSeries ])
});

function parseMovies(
    moviesFolder: string,
    videoExts: string[],
    coverExts: string[],
    subExts: string[]) {

    let movies = [];
    const folders = fs.readdirSync(moviesFolder);
    
    
    folders.forEach((folder)=>{
        let folderPath = moviesFolder + "\\" + folder;
        movies.push({
            name: folder,
            folderPath: folderPath,
            videoPath: folderPath + "\\" + findFile(folderPath, videoExts),
            posterPath: folderPath + "\\" + findFile(folderPath, coverExts),
            subs: folderPath + "\\" + findFile(folderPath, subExts)
        })
    });

    //returns movies json
    return movies
}

function parseTvSeries(
    tvSeriesFolder: string,
    videoExts: string[],
    coverExts: string[],
    subExts: string[]) {

    let tvSeries = [];
    const folders = fs.readdirSync(tvSeriesFolder);
    
    
    folders.forEach((folder)=>{
        let folderPath = tvSeriesFolder + "\\" + folder;
                
        tvSeries.push({
            name: folder,
            folderPath: folderPath,
            posterPath: folderPath + "\\" + findFile(folderPath, coverExts),
            chapters: parseChapters(folderPath, videoExts, coverExts, subExts)
        });
    });

    //returns tvSeries json
    return tvSeries
}

function parseChapters(
    chaptersFolderPath: string,
    videoExts: string[],
    coverExts: string[],
    subExts: string[]) {

    const chaptersFolders = fs.readdirSync(chaptersFolderPath);
    let chapters = [];
    
    chaptersFolders.forEach((chapter)=>{
        let chapterPath = chaptersFolderPath + "\\" + chapter;
        if(fs.statSync(chapterPath).isFile()) return; //continue; equivalent
        chapters.push({
            name: chapter,
            chapterPath: chapterPath,
            episodes: findFiles(chapterPath, videoExts),
            posterPath: chapterPath + "\\" + findFile(chapterPath, coverExts)
        })
    });

    //returns chapters json
    return chapters
}

function createWindow() {
    win = new BrowserWindow({
        width: 1270,
        height: 720,
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: true,
            // enableRemoteModule: true
            contextIsolation: false, //required to make window.require work when in electron window
        }
    })
    // Menu bar
    // win.setMenu(null);
    win.loadURL(
        url.format({
            pathname: path.join(__dirname, `/../../dist/local-entertainment-system/index.html`),
            protocol: 'file:',
            slashes: true,
        })
    )
    // uncomment below to open the DevTools.
    win.webContents.openDevTools();

    // Event when the window is closed.
    win.on('closed', () => {
        win = null
    })
}


/**********************************************************************************/
function findFile(folderPath: string, extensions: string[]): string {
    const files = fs.readdirSync(folderPath);

    for(let i=0; i < files.length; ++i){
        for(let j=0; j < extensions.length; ++j){
            if(files[i].endsWith(extensions[j])){
                return files[i];
            }
        }
    }

    return "ERROR";
}

function findFiles(folderPath: string, extensions: string[]): string[] {
    const files = fs.readdirSync(folderPath);
    let fileNames = [];

    for(let i=0; i < files.length; ++i){
        for(let j=0; j < extensions.length; ++j){
            if(files[i].endsWith(extensions[j])){
                fileNames.push(files[i]);
            }
        }
    }

    return fileNames;
}