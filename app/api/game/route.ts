import { NextResponse } from "next/server";
import {
  localCreateGame,
  localGetGame,
  localStartGame,
  localNextQuestion,
  localShowResults,
  localEndGame,
  localKickPlayer,
  localJoinGame,
  localSubmitAnswer,
} from "@/lib/localGameStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin");

  if (!pin) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const game = localGetGame(pin);
  return NextResponse.json({ game });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { settings, hostId } = body;
        if (!settings || !hostId) {
          return NextResponse.json({ error: "Missing settings or hostId" }, { status: 400 });
        }
        const game = localCreateGame(settings, hostId);
        return NextResponse.json({ success: true, pin: game.pin, game });
      }

      case "join": {
        const { pin, nickname, avatar } = body;
        if (!pin || !nickname) {
          return NextResponse.json({ error: "Missing pin or nickname" }, { status: 400 });
        }
        const res = localJoinGame(pin, nickname, avatar || "🧠");
        if (!res.success) {
          return NextResponse.json(res, { status: 400 });
        }
        return NextResponse.json(res);
      }

      case "start": {
        const { pin } = body;
        const game = localStartGame(pin);
        return NextResponse.json({ success: !!game, game });
      }

      case "nextQuestion": {
        const { pin, questionIndex } = body;
        const game = localNextQuestion(pin, questionIndex);
        return NextResponse.json({ success: !!game, game });
      }

      case "showResults": {
        const { pin } = body;
        const game = localShowResults(pin);
        return NextResponse.json({ success: !!game, game });
      }

      case "endGame": {
        const { pin } = body;
        const game = localEndGame(pin);
        return NextResponse.json({ success: !!game, game });
      }

      case "kickPlayer": {
        const { pin, playerId } = body;
        const game = localKickPlayer(pin, playerId);
        return NextResponse.json({ success: !!game, game });
      }

      case "submitAnswer": {
        const {
          pin,
          playerId,
          questionId,
          questionIndex,
          answerIndex,
          isCorrect,
          responseTimeMs,
          timeLimitSec,
          negativeMarking,
          useDoublePoints,
        } = body;
        const res = localSubmitAnswer(
          pin,
          playerId,
          questionId,
          questionIndex,
          answerIndex,
          isCorrect,
          responseTimeMs,
          timeLimitSec,
          negativeMarking,
          useDoublePoints
        );
        return NextResponse.json({ success: true, points: res.points, game: res.game });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
