import { ensure, is } from "jsr:@core/unknownutil@^4.3.0";
import type { ActionData } from "jsr:@shougo/ddu-kind-file@^0.9.0";
import {
  BaseSource,
  type GatherArguments,
} from "jsr:@shougo/ddu-vim@^6.1.0/source";
import {
  type ActionArguments,
  ActionFlags,
  type Actions,
  type Item,
} from "jsr:@shougo/ddu-vim@^6.1.0/types";
import { printError } from "jsr:@shougo/ddu-vim@^6.1.0/utils";
import { deadline } from "jsr:@std/async@^1.0.0/deadline";

type Params = {
  kind: string;
};

const isDirectory = new Set(["mrr", "mrd"]);

export class Source extends BaseSource<Params> {
  override kind = "file";

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const result = ensure(
          await deadline(
            args.denops.dispatch("mr", `${args.sourceParams.kind}:list`),
            1000,
          ).catch(() => {
            printError(args.denops, "Failed to call vim-mr denops module. Please check it.");
            return [];
          }),
          is.ArrayOf(is.String),
        ).map((path) => ({
          word: path,
          action: {
            path,
            isDirectory: isDirectory.has(args.sourceParams.kind),
          },
        }));
        controller.enqueue(result);
        controller.close();
      },
    });
  }

  override actions: Actions<Params> = {
    async delete(args: ActionArguments<Params>) {
      for (const item of args.items) {
        await args.denops.call(
          `mr#${args.sourceParams.kind}#delete`,
          ensure(item.action, is.ObjectOf({ path: is.String })).path,
        );
      }
      return ActionFlags.RefreshItems;
    },
  };

  override params(): Params {
    return {
      kind: "mru",
    };
  }
}
