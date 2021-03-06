const p5 = require("p5/lib/p5.min") as any;

import { ClassificationData } from "@/classify";
import { GenericHandTrackingData } from "@/devices";
import { LeapDeviceFrame } from "@/devices/leapmotion";
import { Game, GameConfiguration } from "@/games/types";
import { project } from "@/ui/graphics/util";

import Vue from "vue";
import {
  drawBullets,
  drawScene,
  drawScore,
  drawSpaceRocks,
  drawSpaceShip
} from "./draw";
import {
  processBulletCollision,
  processSpaceShipCollision,
  shootBullet,
  tickBullets,
  tickSpaceRocks,
  updateScore
} from "./logic";
import { Bullet, SpaceRock } from "./types";

export default class SpaceShooterGame implements Game {
  public iP5: p5 | undefined;

  private width!: number;
  private height!: number;

  private x: number = 0;
  private y: number = 0;

  private score: number = 0;
  private gameOver: boolean = false;
  private paused: boolean = false;

  private bullets: Bullet[] = [];
  private spaceRocks: SpaceRock[] = [];

  private metricsArray: GenericHandTrackingData[] = [];

  public async onStart(config: GameConfiguration, notifyGameOver: () => void) {
    this.width = config.element.clientWidth;
    this.height = config.element.clientHeight;
    this.x = config.element.clientWidth / 2;
    this.y = config.element.clientHeight - 50;
    this.iP5 = new p5((s: p5) => {
      s.setup = () => {
        s.createCanvas(config.element.clientWidth, config.element.clientHeight);
      };

      s.draw = () => {
        if (this.paused) {
          return;
        }
        this.bullets = tickBullets(this.bullets, s);
        this.spaceRocks = tickSpaceRocks(this.spaceRocks, s);
        const bulletCollissionOccurred = processBulletCollision(
          this.bullets,
          this.spaceRocks,
          s
        );
        if (bulletCollissionOccurred) {
          this.score = updateScore(this.score);
        }
        this.gameOver = processSpaceShipCollision(
          this.x,
          this.y,
          this.spaceRocks
        );
        if (this.gameOver) {
          notifyGameOver();
          s.remove();
        } else {
          drawScene(s);
          drawScore(this.score, s);
          drawSpaceShip(this.x, this.y, s);
          drawSpaceRocks(this.spaceRocks, s);
          drawBullets(this.bullets, s);
        }
      };
    }, config.element);
  }

  public async onStop(vm: Vue) {
    vm.$router.push({
      name: "game-over",
      params: {
        gameIdentifier: "space-shooter",
        score: this.score,
        statistics: this.metricsArray
      } as any
    });
  }

  public async onPause() {
    this.paused = true;
  }

  public async onResume() {
    this.paused = false;
  }

  public onClassificationReceived(c: ClassificationData) {
    shootBullet(this.bullets, this.x, this.y, 5);
  }

  public onMotionTrackingDataReceived(m: GenericHandTrackingData) {
    if (this.metricsArray.length < 1000) {
      this.metricsArray.push(m);
    }
    const leap = m.data as LeapDeviceFrame;
    const iBox = leap.interactionBox;
    if (leap.hands && leap.hands.length >= 1) {
      this.x = project(
        leap.hands[0].palmPosition[0],
        iBox.center[0] - iBox.size[0] / 2,
        iBox.center[0] + iBox.size[0] / 2,
        0,
        this.width
      );
      this.y = project(
        leap.hands[0].palmPosition[2],
        iBox.center[2] - iBox.size[2] / 2,
        iBox.center[2] + iBox.size[2] / 2,
        this.height - this.height / 4,
        this.height - 100
      );
    }
  }
}
