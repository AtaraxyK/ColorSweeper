window.COLOR_SWEEPER_CONFIG = {
  distinguishableColors: [
    "#FF0000", // 1 빨강
    "#FF7F00", // 2 주황
    "#FFFF00", // 3 노랑
    "#00C853", // 4 초록
    "#00B0FF", // 5 하늘
    "#2962FF", // 6 파랑
    "#AA00FF", // 7 보라
    "#FF4D6D", // 8 핑크
    "#795548", // 9 브라운
    "#607D8B", // 10 블루그레이
    "#00ACC1", // 11 청록
    "#8BC34A", // 12 라임
    "#FFD54F", // 13 연노랑
    "#FF8A65", // 14 살구
    "#9C27B0", // 15 자주
    "#3F51B5", // 16 남색
    "#009688", // 17 딥틸
    "#CDDC39", // 18 황록
    "#FF5722", // 19 진주황
    "#616161"  // 20 진회색
  ],
  builtinPresets: [
    {
      id: 'easy',
      name: '쉬움',
      config: {
        subStagesPerStage: 7,
        initialColorCount: 3,
        initialBoardSize: 5,
        colorIncreaseEveryStages: 1,
        colorIncreaseAmount: 1,
        boardIncreaseEveryStages: 3,
        boardIncreaseAmount: 1,
        maxColorCount: null,
        maxBoardSize: null,
        extraMoveBuffer: 10,
      },
    },
    {
      id: 'normal',
      name: '그럭저럭',
      config: {
        subStagesPerStage: 6,
        initialColorCount: 4,
        initialBoardSize: 5,
        colorIncreaseEveryStages: 1,
        colorIncreaseAmount: 1,
        boardIncreaseEveryStages: 3,
        boardIncreaseAmount: 1,
        maxColorCount: null,
        maxBoardSize: null,
        extraMoveBuffer: 9,
      },
    },
    {
      id: 'hard',
      name: '어려움',
      config: {
        subStagesPerStage: 5,
        initialColorCount: 5,
        initialBoardSize: 7,
        colorIncreaseEveryStages: 1,
        colorIncreaseAmount: 1,
        boardIncreaseEveryStages: 3,
        boardIncreaseAmount: 1,
        maxColorCount: null,
        maxBoardSize: null,
        extraMoveBuffer: 8,
      },
    },
    {
      id: 'very-hard',
      name: '많이 어려움',
      config: {
        subStagesPerStage: 4,
        initialColorCount: 6,
        initialBoardSize: 8,
        colorIncreaseEveryStages: 1,
        colorIncreaseAmount: 1,
        boardIncreaseEveryStages: 3,
        boardIncreaseAmount: 1,
        maxColorCount: null,
        maxBoardSize: null,
        extraMoveBuffer: 7,
      },
    },
    {
      id: 'extreme',
      name: '정말 많이 어려움',
      config: {
        subStagesPerStage: 3,
        initialColorCount: 7,
        initialBoardSize: 10,
        colorIncreaseEveryStages: 1,
        colorIncreaseAmount: 1,
        boardIncreaseEveryStages: 3,
        boardIncreaseAmount: 1,
        maxColorCount: null,
        maxBoardSize: null,
        extraMoveBuffer: 6,
      },
    },
  ],
};
