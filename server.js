const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * GET /api/mediafire?link=
 */
app.get("/api/mediafire", async (req, res) => {
  try {
    const link = req.query.link;

    if (!link || !/www\.mediafire\.com/.test(link)) {
      return res.status(400).json({
        status: false,
        message: "Masukan link MediaFire yang valid"
      });
    }

    const response = await axios.get(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
        "Accept-Encoding": "gzip, deflate, br"
      }
    });

    const $ = cheerio.load(response.data);

    const downloadUrl = $(".input.popsok").attr("href");
    if (!downloadUrl || !/\/\/download\d+\.mediafire\.com\//.test(downloadUrl)) {
      return res.status(404).json({
        status: false,
        message: "Direct download link tidak ditemukan"
      });
    }

    const name = $(".intro .filename").text().trim();
    const size = $(".details li:nth-child(1) span").text().trim();
    const date = $(".details li:nth-child(2) span").text().trim();
    const type = $(".intro .filetype").text().trim();

    const contMap = {
      af: "Africa",
      an: "Antarctica",
      as: "Asia",
      eu: "Europe",
      na: "North America",
      oc: "Oceania",
      sa: "South America"
    };

    const locationBox = $(".DLExtraInfo-uploadLocation");

    const continentCode = locationBox
      .find(".DLExtraInfo-uploadLocationRegion")
      .attr("data-lazyclass")
      ?.replace("continent-", "");

    const location =
      locationBox
        .find(".DLExtraInfo-sectionDetails p")
        .text()
        .match(/from (.*?) on/)?.[1] || "Unknown";

    const flag = locationBox
      .find(".flag")
      .attr("data-lazyclass")
      ?.replace("flag-", "");

    res.json({
      status: true,
      result: {
        name,
        size,
        date,
        type,
        continent: contMap[continentCode] || "Unknown",
        location,
        flag,
        download_url: downloadUrl
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message
    });
  }
});

/**
 * Optional: Proxy Download
 * GET /api/mediafire/download?url=
 */
app.get("/api/mediafire/download", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("URL required");

    const response = await axios.get(url, { responseType: "stream" });

    res.setHeader(
      "Content-Disposition",
      response.headers["content-disposition"] || "attachment"
    );
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "application/octet-stream"
    );

    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MediaFire API running at http://localhost:${PORT}`);
});
