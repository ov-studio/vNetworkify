/*----------------------------------------------------------------
     Resource: Vital.network
     Script: webpack.config.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Webpack Confign
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CPath = require("path")
const vKit = require("@vstudio/vital.kit")
const CPackage = require("./package.json")


//////////////
// Exports //
//////////////

//const vIgnore = ["cors", "express", "compression", "ws"]
//vIgnore.forEach((i) => vKit.ignore.web[i] = false)

module.exports = [
    // Front-End
    {
        target: "web",
        mode: "production",
        entry: {
            app: ["./src/"]
        },
        output: {
          path: CPath.resolve(__dirname, "build"),
          filename: `${CPackage.name}-client.js`
        },
        resolve: {
            //alias: vKit.ignore.web
        }
    },
    // Back-End
    {
        target: "node",
        mode: "production",
        entry: {
          app: ["./src/"]
        },
        output: {
          path: CPath.resolve(__dirname, "build"),
          filename: `${CPackage.name}-server.js`
        },
        externals: [require("webpack-node-externals")()]
    }
]