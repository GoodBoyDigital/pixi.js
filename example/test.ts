/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable newline-before-return */
/* eslint-disable newline-after-var */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/quotes */
import { Application } from "../src/app/Application";
import { Assets } from "../src/assets/Assets";
import { Container } from "../src/scene/container/Container";
import { Graphics } from "../src/scene/graphics/shared/Graphics";
import { Sprite } from "../src/scene/sprite/Sprite";

// import { analyzer } from "./gpu";
// analyzer();

async function myTest()
{
    const app = new Application();

    await app.init({
        width: 1000,
        height: 1000,
        preference: "webgpu",
        autoDensity: true,
        resolution: window.devicePixelRatio,
    });
    document.body.appendChild(app.canvas);

    const container = new Container();
    app.stage.addChild(container);
    container.scale.set(0.7);

    const texture = await Assets.load("assets/boat.jpeg");
    const sprite = Sprite.from(texture);
    sprite.width = 200;
    sprite.height = 100;
    sprite.scale.set(2);
    sprite.angle = 30;
    sprite.position.set(100);
    sprite.label = "sprite1";
    container.addChild(sprite);

    app.ticker.add(()=>{
        // sprite.angle++;
    })

    // from svg path
    const svg = new Graphics();
    svg.svg(`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
    <ellipse cx="100" cy="50" rx="100" ry="50" style="fill:yellow;"/>
    </svg>`);
    svg.scale.set(2);
    svg.position.set(50, 600);
    svg.label = "svg1";
    container.addChild(svg);

    const g = new Graphics();
    g.roundRect(0, 0, 100, 100, 10);
    g.fill({ color: 0xffff00 });
    g.scale.set(2);
    g.angle = 30;
    g.position.set(700, 500);
    g.label = "graphics1";
    container.addChild(g);

    const sprites = [sprite, svg, g];

    for (const sprite of sprites)
    {
        sprite.eventMode = "static";
        sprite.on("click", () =>
        {
            console.log("click");
            console.log(sprite.localTransform);
            console.log(sprite.worldTransform);
            console.log(sprite.layerTransform);
            console.log(sprite.getLocalBounds());

            const bounds1 = sprite.getBounds();
            const g1 = new Graphics();
            g1.rect(bounds1.x, bounds1.y, bounds1.width, bounds1.height);
            g1.stroke({ width: 1, color: 0xff0000 });
            app.stage.addChild(g1);

            const bounds2 = sprite.getLocalBounds();
            const g2 = new Graphics();
            g2.rect(bounds2.x, bounds2.y, bounds2.width, bounds2.height);
            g2.stroke({ width: 1, color: 0xff00ff });
            sprite.addChild(g2);
        });
    }
}

myTest();
