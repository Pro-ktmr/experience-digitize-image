import {
  Button,
  Container,
  Slider,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

const SIZE = 512;
const GRADIATION_SIZE = 64;
const getDefaultArray = () =>
  Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));

const STEPS = ["標本化", "量子化", "符号化"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [resolution, setResolution] = useState(4);
  const [gradiation, setGradiation] = useState(4);
  const [selectedColor, setSelectedColor] =
    useState<number[][]>(getDefaultArray());

  const [averageColor, setAverageColor] =
    useState<number[][]>(getDefaultArray());
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current == null) return;
    const ctx = ref.current.getContext("2d");
    if (ctx == null) return;

    const calculatedResolution = 2 ** resolution;

    showFigure(ctx);
    const tmp = getAverageColor(ctx, calculatedResolution);
    if (tmp.length === 0) return;
    setAverageColor(tmp);
  }, [step, resolution]);

  return (
    <>
      <Head>
        <title>画像のデジタル化 体験ツール</title>
      </Head>
      <Container maxWidth="lg">
        <Typography variant="h3" component="h1">
          画像のデジタル化 体験ツール
        </Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ my: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {step === 0 && (
          <Sampling
            setStep={setStep}
            resolution={resolution}
            setResolution={setResolution}
            averageColor={averageColor}
          />
        )}
        {step === 1 && (
          <Quantization
            setStep={setStep}
            resolution={resolution}
            averageColor={averageColor}
            gradiation={gradiation}
            setGradiation={setGradiation}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
          />
        )}
        {step === 2 && (
          <Coding
            setStep={setStep}
            resolution={resolution}
            gradiation={gradiation}
            selectedColor={selectedColor}
          />
        )}
        {step === 3 && (
          <>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Button onClick={() => setStep(2)}>前のステップへ</Button>
            </div>
            <div>
              解像度：縦 {2 ** resolution} × 横 {2 ** resolution}
            </div>
            <div>階調：{2 ** gradiation} 階調</div>
            <div>データ：</div>
            <textarea
              style={{
                width: 16 * Math.log2(2 ** gradiation) * 2 ** resolution,
                fontSize: 32,
              }}
              rows={16}
              defaultValue={(() => {
                const colorCandidates = Array.from(
                  { length: 2 ** gradiation },
                  (_, i) => Math.floor((i / (2 ** gradiation - 1)) * 255)
                );
                let res = "";
                for (let y = 0; y < 2 ** resolution; y++) {
                  for (let x = 0; x < 2 ** resolution; x++) {
                    const idx = colorCandidates.indexOf(selectedColor[y][x]);
                    res += idx
                      .toString(2)
                      .padStart(Math.log2(2 ** gradiation), "0");
                  }
                }
                return res;
              })()}
              disabled
            />
          </>
        )}
        <canvas
          ref={ref}
          style={{
            display: "none",
          }}
          width={SIZE}
          height={SIZE}
        />
      </Container>
    </>
  );
}

const Sampling = ({
  setStep,
  resolution,
  setResolution,
  averageColor,
}: {
  setStep: (value: number) => void;
  resolution: number;
  setResolution: (value: number) => void;
  averageColor: number[][];
}) => {
  const calculatedResolution = 2 ** resolution;

  const beforeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (beforeRef.current == null) return;
    const ctx = beforeRef.current.getContext("2d");
    if (ctx == null) return;

    showFigure(ctx);
  }, [beforeRef]);

  const afterRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (afterRef.current == null) return;
    const ctx = afterRef.current.getContext("2d");
    if (ctx == null) return;

    fillGridColor(ctx, calculatedResolution, averageColor);
    showGrid(ctx, calculatedResolution);
  }, [afterRef, averageColor, calculatedResolution]);

  return (
    <>
      <Typography>
        縦{2 ** resolution} × 横{2 ** resolution}
      </Typography>
      <Slider
        value={resolution}
        min={1}
        step={1}
        max={8}
        scale={(v) => 2 ** v}
        valueLabelFormat={(v) => `縦${2 ** resolution} × 横${2 ** resolution}`}
        onChange={(_, v) => setResolution(v)}
        valueLabelDisplay="auto"
        aria-labelledby="non-linear-slider"
      />
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Button onClick={() => setStep(1)}>次のステップへ</Button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <canvas ref={beforeRef} width={SIZE} height={SIZE} />
        <span style={{ fontSize: 64 }}>➡</span>
        <canvas ref={afterRef} width={SIZE} height={SIZE} />
      </div>
    </>
  );
};

const Quantization = ({
  setStep,
  resolution,
  averageColor,
  gradiation,
  setGradiation,
  selectedColor,
  setSelectedColor,
}: {
  setStep: (value: number) => void;
  resolution: number;
  averageColor: number[][];
  gradiation: number;
  setGradiation: (value: number) => void;
  selectedColor: number[][];
  setSelectedColor: (value: number[][]) => void;
}) => {
  const calculatedResolution = 2 ** resolution;
  const calculatedGradiation = 2 ** gradiation;

  const colorCandidates = Array.from({ length: calculatedGradiation }, (_, i) =>
    Math.floor((i / (calculatedGradiation - 1)) * 255)
  );

  const [idx, setIdx] = useState(0);
  const y = Math.floor(idx / calculatedResolution);
  const x = idx % calculatedResolution;

  const beforeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (beforeRef.current == null) return;
    const ctx = beforeRef.current.getContext("2d");
    if (ctx == null) return;

    fillGridColor(ctx, calculatedResolution, averageColor);
    showGrid(ctx, calculatedResolution);
    ctx.strokeStyle = "red";
    ctx.strokeRect(
      x * (SIZE / calculatedResolution),
      y * (SIZE / calculatedResolution),
      SIZE / calculatedResolution,
      SIZE / calculatedResolution
    );
  }, [beforeRef, averageColor, idx]);

  const afterRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (afterRef.current == null) return;
    const ctx = afterRef.current.getContext("2d");
    if (ctx == null) return;

    fillGridColor(ctx, calculatedResolution, selectedColor);
    showGrid(ctx, calculatedResolution);
    showNumber(ctx, calculatedResolution, selectedColor, colorCandidates);
  }, [afterRef, selectedColor, idx]);

  useEffect(() => {
    const updated = getDefaultArray();
    for (let y = 0; y < calculatedResolution; y++) {
      for (let x = 0; x < calculatedResolution; x++) {
        if (!colorCandidates.includes(selectedColor[y][x])) {
          updated[y][x] = colorCandidates[0];
        } else {
          updated[y][x] = selectedColor[y][x];
        }
      }
    }
    setSelectedColor(updated);
  }, [gradiation]);

  return (
    <>
      <Typography>{2 ** gradiation}階調</Typography>
      <Slider
        value={gradiation}
        min={1}
        step={1}
        max={4}
        scale={(v) => 2 ** v}
        valueLabelFormat={(v) => `${v}階調`}
        onChange={(_, v) => setGradiation(v)}
        valueLabelDisplay="auto"
        aria-labelledby="non-linear-slider"
      />
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Button onClick={() => setStep(0)}>前のステップへ</Button>
        <Button onClick={() => setStep(2)}>次のステップへ</Button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {colorCandidates.map((color, i) => {
          return (
            <span
              key={color}
              className="hoverable"
              style={{
                display: "inline-block",
                width: GRADIATION_SIZE,
                height: GRADIATION_SIZE,
                backgroundColor: `rgb(${color}, ${color}, ${color})`,
                border: "1px solid #000",
                color: "blue",
                paddingLeft: 4,
              }}
              onClick={() => {
                setIdx((idx + 1) % calculatedResolution ** 2);
                setSelectedColor(
                  (() => {
                    const newColor = [...selectedColor];
                    newColor[y][x] = color;
                    return newColor;
                  })()
                );
              }}
            >
              {i}
            </span>
          );
        })}
      </div>
      <div
        style={{
          background: `rgb(${averageColor[y][x]}, ${averageColor[y][x]}, ${averageColor[y][x]})`,
          height: GRADIATION_SIZE,
          border: "1px red solid",
          marginBottom: 4,
        }}
      ></div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <canvas ref={beforeRef} width={SIZE} height={SIZE} />
        <span style={{ fontSize: 64 }}>➡</span>
        <canvas ref={afterRef} width={SIZE} height={SIZE} />
      </div>
    </>
  );
};

const Coding = ({
  setStep,
  resolution,
  gradiation,
  selectedColor,
}: {
  setStep: (value: number) => void;
  resolution: number;
  gradiation: number;
  selectedColor: number[][];
}) => {
  const calculatedResolution = 2 ** resolution;
  const calculatedGradiation = 2 ** gradiation;

  const colorCandidates = Array.from({ length: calculatedGradiation }, (_, i) =>
    Math.floor((i / (calculatedGradiation - 1)) * 255)
  );

  const beforeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (beforeRef.current == null) return;
    const ctx = beforeRef.current.getContext("2d");
    if (ctx == null) return;

    fillGridColor(ctx, calculatedResolution, selectedColor);
    showGrid(ctx, calculatedResolution);
    showNumber(ctx, calculatedResolution, selectedColor, colorCandidates);
  }, [beforeRef, selectedColor]);

  const afterRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (afterRef.current == null) return;
    const ctx = afterRef.current.getContext("2d");
    if (ctx == null) return;

    fillGridColor(ctx, calculatedResolution, selectedColor);
    showGrid(ctx, calculatedResolution);
    showNumber(ctx, calculatedResolution, selectedColor, colorCandidates, true);
  }, [afterRef, selectedColor]);

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Button onClick={() => setStep(1)}>前のステップへ</Button>
        <Button onClick={() => setStep(3)}>次のステップへ</Button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <canvas ref={beforeRef} width={SIZE} height={SIZE} />
        <span style={{ fontSize: 64 }}>➡</span>
        <canvas ref={afterRef} width={SIZE} height={SIZE} />
      </div>
    </>
  );
};

const showFigure = (ctx: CanvasRenderingContext2D) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, SIZE);
  gradient.addColorStop(0, "#444");
  gradient.addColorStop(0.5, "#fff");
  gradient.addColorStop(1, "#444");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.font = `${SIZE}px bold sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText("の", 0, SIZE / 2);
};

const getAverageColor = (
  ctx: CanvasRenderingContext2D,
  calculatedResolution: number
): number[][] => {
  let res: number[][] = Object.assign(getDefaultArray());
  for (let y = 0; y < calculatedResolution; y++) {
    for (let x = 0; x < calculatedResolution; x++) {
      let avgColor = 0;
      for (let i = 0; i < SIZE / calculatedResolution; i++) {
        for (let j = 0; j < SIZE / calculatedResolution; j++) {
          const pixelData = ctx.getImageData(
            (SIZE / calculatedResolution) * x + i,
            (SIZE / calculatedResolution) * y + j,
            1,
            1
          ).data;
          avgColor += pixelData[0] / (SIZE / calculatedResolution) ** 2;
        }
      }
      res[y][x] = avgColor;
    }
  }
  return res;
};

const fillGridColor = (
  ctx: CanvasRenderingContext2D,
  calculatedResolution: number,
  colorGrid: number[][]
) => {
  for (let y = 0; y < SIZE; y += SIZE / calculatedResolution) {
    for (let x = 0; x < SIZE; x += SIZE / calculatedResolution) {
      const color =
        colorGrid[y / (SIZE / calculatedResolution)][
          x / (SIZE / calculatedResolution)
        ];
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
      ctx.fillRect(
        x,
        y,
        SIZE / calculatedResolution,
        SIZE / calculatedResolution
      );
    }
  }
};

const showGrid = (
  ctx: CanvasRenderingContext2D,
  calculatedResolution: number
) => {
  for (let i = 0; i < SIZE; i += SIZE / calculatedResolution) {
    ctx.fillStyle = "white";
    ctx.fillRect(i, 0, 1, SIZE);
    ctx.fillRect(0, i, SIZE, 1);
  }
};

const showNumber = (
  ctx: CanvasRenderingContext2D,
  calculatedResolution: number,
  colorGrid: number[][],
  colorCandidates: number[],
  bits: boolean = false
) => {
  for (let y = 0; y < SIZE; y += SIZE / calculatedResolution) {
    for (let x = 0; x < SIZE; x += SIZE / calculatedResolution) {
      const idx = colorCandidates.indexOf(
        colorGrid[y / (SIZE / calculatedResolution)][
          x / (SIZE / calculatedResolution)
        ]
      );
      ctx.fillStyle = "blue";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const text = bits
        ? idx.toString(2).padStart(Math.log2(colorCandidates.length), "0")
        : idx.toString();
      ctx.fillText(`${text}`, x + 4, y + 4);
    }
  }
};
