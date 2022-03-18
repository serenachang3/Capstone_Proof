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

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

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
  }, 100);

  // useEffect(() => {
  //   async function getPoseInfoAndCriteria() {
  //     await dispatch(getPose({poseName: exercise}));
  //   }
  //   getPoseInfoAndCriteria();
  // }, [exercise]);

  // useEffect(() => {
  //   if (criteria) {
  //     setOpenInstructions(true);
  //   }
  // }, [criteria]);

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
        let poses = await detector.estimatePoses(video);
		// console.log('poses', poses)
        requestAnimationFrame(async () => {
          await getPoses();
        });
        // const ctx = canvasRef.current.getContext("2d");
        
        drawCanvas(poses, videoWidth, videoHeight, canvasRef);
        
      }
    }
  }

  function drawKeypoint(keypoint) {
    const ctx = canvasRef.current.getContext("2d");
   
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
    const ctx = canvasRef.current.getContext("2d");
    const keypointInd = poseDetection.util.getKeypointIndexBySide("MoveNet");
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
    }
    //right points will be orange... note your actual right side (technically left side when looking at video)
    ctx.fillStyle = "Orange";
    for (const i of keypointInd.right) {
      drawKeypoint(keypoints[i]);
    }
  }

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

  function drawCanvas(poses, videoWidth, videoHeight, canvas) {
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;

    drawKeypoints(poses[0].keypoints);
    drawSkeleton(poses[0].keypoints);
  }

  getPoses();

  return (
    <div>
      <Webcam
        id="webcam"
        ref={webcamRef}
        style={{
          transform: "scaleX(-1)",
          filter: "FlipH",
          position: "fixed",
          height: "100%",
          width: "100%",
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
          height: "100%",
          width: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

// if (time === maxTime) {
//   // poses[0].keypoints[0].y refers to the y coordinate of the nose keypoint
//   noseHeight = poses[0].keypoints[0].y;
// }

// if (
//   status === "counted" &&
//   poses[0].keypoints[0].y > noseHeight + 100
// ) {
//   status = "bottom";
// }

// if (status === "bottom" && poses[0].keypoints[0].y < noseHeight + 100) {
//   status = "rising";
// }

// if (status === "rising" && poses[0].keypoints[0].y < noseHeight + 30) {
//   status = "counted";
//   reps++;
//   const result = await evaluateExercise(angleArray, criteria);
//   let isThisRepGood = 0;
//   Object.keys(result).forEach((angle) => {
//     if (result[angle] && summaryOfScores[angle]) {
//       summaryOfScores[angle]++;
//       isThisRepGood++;
//     } else if (result[angle]) {
//       summaryOfScores[angle] = 1;
//       isThisRepGood++;
//     } else if (!summaryOfScores[angle]) {
//       summaryOfScores[angle] = 0;
//     }
//   });
//   if (isThisRepGood > 1) goodReps++;
//   summaryOfScores.reps = reps;
//   results.push(result);
// }
