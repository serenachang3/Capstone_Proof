import React, { useRef, useState, useEffect } from "react";
// import "./App.css";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";
// import { useDispatch, useSelector } from "react-redux";

export default function App() {
  //   const dispatch = useDispatch();
  const [detector, setDetector] = useState();
  const [angleArray, setAngleArray] = useState([]);
 
  // const maxTime = 10
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  async function init() {
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
    };
    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
    setDetector(detector);
  }

  useEffect(() => {
    init();
    return () => {
      init();
    };
  }, 1000);

  let allPoses = {};

  async function getPoses() {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get video properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video properties
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // console.log('detector', detector)
      if (detector) {
        const start = Date.now();
        let poses = await detector.estimatePoses(video);
        requestAnimationFrame(getPoses);
        // const ctx = canvasRef.current.getContext("2d");
        drawCanvas(poses, videoWidth, videoHeight, canvasRef);
        allPoses.poses = poses;
        const end = Date.now();
      }
    }
  }
// ******* MEDIA RECORDING CODE START 
  const handleStartCaptureClick = React.useCallback(() => {
    setCapturing(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
      mimeType: "video/webm"
    });
    mediaRecorderRef.current.addEventListener(
      "dataavailable",
      handleDataAvailable
    );
    mediaRecorderRef.current.start();
  }, [webcamRef, setCapturing, mediaRecorderRef]);

  const handleDataAvailable = React.useCallback(
    ({ data }) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleStopCaptureClick = React.useCallback(() => {
    mediaRecorderRef.current.stop();
    setCapturing(false);
  }, [mediaRecorderRef, webcamRef, setCapturing]);

  const handleDownload = React.useCallback(() => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: "video/webm"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "react-webcam-stream-capture.webm";
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [recordedChunks]);
// ******* MEDIA RECORDING CODE END  


  function drawCanvas(poses, videoWidth, videoHeight, canvas) {
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;
    //poses gives array of all 17 points as keys w/ objects (y, x, score, name)

    // drawKeypoints(poses[0].keypoints);
    // // poses[0].keypoints ----> this is an array containing 17 objects
    // drawSkeleton(poses[0].keypoints);
    drawSomeRandomPointsClusteredAtKeypoint(poses[0].keypoints);
  }

  function drawKeypoint(keypoint) {
    //keypoint argument is a singular point --> (y, x, score, name)
    const ctx = canvasRef.current.getContext("2d");
    //ctx = methods you get in 2D

    // If score is null, just show the keypoint.
    const confidence = keypoint.score != null ? keypoint.score : 1;
    const scoreThreshold = 0.3 || 0;

    if (confidence >= scoreThreshold) {
      const circle = new Path2D();
      circle.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
      ctx.fill(circle);
      ctx.stroke(circle);
    }
  }

  function drawKeypoints(keypoints) {
    //keypoints is an array of 17 objects of the keypoints

    const ctx = canvasRef.current.getContext("2d");
    const keypointInd = poseDetection.util.getKeypointIndexBySide("MoveNet");
    // object with keys: left, middle, right ---> value is an array of the key points (body parts)
    ctx.fillStyle = "White";
    ctx.strokeStyle = "White";
    ctx.lineWidth = 2;

    //middle points will be white (just nose)
    for (const i of keypointInd.middle) {
      drawKeypoint(keypoints[i]);
    }
    //left points will be green... note your actual left side (technically right side when looking at video)
    ctx.fillStyle = "Green";
    for (const i of keypointInd.left) {
      drawKeypoint(keypoints[i]);
      //looping through all the left points & drawing a outline filled circle
    }
    //right points will be orange... note your actual right side (technically left side when looking at video)
    ctx.fillStyle = "Orange";
    for (const i of keypointInd.right) {
      drawKeypoint(keypoints[i]);
    }
  }

  // *********************** MICA ANIMATIONS ******************************
  function drawSomeRandomPointsClusteredAtKeypoint(keypoints) {
    const ctx = canvasRef.current.getContext("2d");

    for (let j = 0; j < keypoints.length; j++) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const generateRandomLocal = function (min, max) {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min) + min);
        };

        const currKey = keypoints[j];

        const randomX = generateRandomLocal(currKey.x - 50, currKey.x + 50);
        const randomY = generateRandomLocal(currKey.y - 50, currKey.y + 50);
        ctx.arc(randomX, randomY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "pink";
        ctx.fill();
      }
    }
  }

  //   function theoreticallyCreateUpwardFloatingDotTrails(
  // 	ctx,
  // 	x,
  // 	y,
  // 	r,
  // 	color,
  // 	canvas
  //   ) {
  // 	requestAnimationFrame(theoreticallyCreateUpwardFloatingDotTrails);
  // 	ctx.clearRect(0, 0, canvas.height, canvas.width); // might need some clarification on what to pass in
  // 	ctx.beginPath();
  // 	ctx.arc(x, y, r, 0, 2 * Math.PI);
  // 	ctx.fillStyle = color;
  // 	ctx.fill();
  // 	x++
  //   }

  function drawSkeleton(keypoints) {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "White";
    ctx.strokeStyle = "White";
    ctx.lineWidth = 2;

    poseDetection.util.getAdjacentPairs("MoveNet").forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      const firstX = kp1.x;
      const firstY = kp1.y;
      const secondX = kp2.x;
      const secondY = kp2.y;
      const name = kp1.name + kp2.name;
      const adjacentPairAngle = Math.abs(
        (Math.atan((firstY - secondY) / (firstX - secondX)) * 180) / Math.PI
      );

      if (kp1.score > 0.5 && kp2.score > 0.5) {
        angleArray.push({ [name]: [adjacentPairAngle, kp1.score, kp2.score] });
      }

      // If score is null, just show the keypoint.
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;
      const scoreThreshold = 0.2;

      if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });
  }

  //   function drawCanvas(poses, videoWidth, videoHeight, canvas) {
  //     canvas.current.width = videoWidth;
  //     canvas.current.height = videoHeight;

  //     drawKeypoints(poses[0].keypoints);
  //     drawSkeleton(poses[0].keypoints);
  //   }

  getPoses();

  return (
    <div>
      <Webcam
        id="webcam"
        ref={webcamRef}
        audio={false}
        style={{
          transform: "scaleX(-1)",
          filter: "FlipH",
          position: "fixed",
          height: "75%",
          width: "75%",
          objectFit: "cover",
        }}  
      
      />

      <canvas
        id="canvas"
        ref={canvasRef}
        style={{
          transform: "scaleX(-1)",
          filter: "FlipH",
          position: "fixed",
          height: "75%",
          width: "75%",
          objectFit: "cover",
        }}
      />
      
      {capturing ? (
        <button onClick={handleStopCaptureClick}>Stop Capture</button>
      ) : (
        <button onClick={handleStartCaptureClick}>Start Capture</button>
      )}
      {recordedChunks.length > 0 && (
        <button onClick={handleDownload}>Download</button>
      )}
      
    </div>
  );
}
