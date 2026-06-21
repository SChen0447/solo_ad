import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// src/backend/server.ts
import express from "express";
import cors from "cors";
import { v4 as uuidv42 } from "uuid";

// src/backend/dataStore.ts
import { v4 as uuidv4 } from "uuid";
var works = [
  {
    id: "w001",
    title: "\u539F\u8272\u690D\u97A3\u9769\u77ED\u5939",
    description: "\u91C7\u7528\u610F\u5927\u5229\u8FDB\u53E3\u539F\u8272\u690D\u97A3\u9769\uFF0C\u7EAF\u624B\u5DE5\u7F1D\u7EBF\u5236\u4F5C\u3002\u968F\u7740\u4F7F\u7528\u65F6\u95F4\u63A8\u79FB\uFF0C\u76AE\u9769\u4F1A\u9010\u6E10\u4EA7\u751F\u8FF7\u4EBA\u7684\u871C\u8272\u5305\u6D46\uFF0C\u6BCF\u4E00\u4EF6\u90FD\u662F\u72EC\u4E00\u65E0\u4E8C\u7684\u65F6\u5149\u827A\u672F\u54C1\u3002\u9002\u5408\u65E5\u5E38\u968F\u8EAB\u643A\u5E26\uFF0C\u53EF\u653E\u7F6E6\u5F20\u5361\u7247\u548C\u5C11\u91CF\u73B0\u91D1\u3002",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=400&fit=crop",
    tags: ["\u690D\u97A3\u9769", "\u539F\u8272", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "w002",
    title: "\u94EC\u97A3\u9769\u7F16\u7EC7\u6258\u7279\u5305",
    description: "\u7CBE\u9009\u6CD5\u56FD\u5C0F\u7F8A\u76AE\u94EC\u97A3\u9769\uFF0C\u642D\u914D\u4F20\u7EDF\u4E09\u80A1\u7F16\u7EC7\u6280\u6CD5\u3002\u5305\u8EAB\u67D4\u8F6F\u8F7B\u76C8\uFF0C\u5185\u90E8\u7A7A\u95F4\u5BBD\u655E\uFF0C\u53EF\u5BB9\u7EB313\u5BF8\u7B14\u8BB0\u672C\u7535\u8111\u3002\u9002\u5408\u901A\u52E4\u548C\u65E5\u5E38\u8D2D\u7269\u4F7F\u7528\u3002",
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=400&fit=crop",
    tags: ["\u94EC\u97A3\u9769", "\u7F16\u7EC7", "\u5C01\u8FB9", "\u624B\u5DE5\u7F1D\u7EBF"]
  },
  {
    id: "w003",
    title: "\u5341\u5B57\u7EB9\u957F\u5939",
    description: "\u5341\u5B57\u7EB9\u725B\u76AE\u7EB9\u7406\u6E05\u6670\uFF0C\u8D28\u611F\u786C\u6717\u3002\u957F\u5939\u8BBE\u8BA1\u62E5\u670912\u4E2A\u5361\u4F4D\u30012\u4E2A\u9694\u5C42\u548C1\u4E2A\u62C9\u94FE\u96F6\u94B1\u5305\uFF0C\u529F\u80FD\u6027\u6781\u5F3A\u3002",
    imageUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?w=600&h=400&fit=crop",
    tags: ["\u5341\u5B57\u7EB9", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "w004",
    title: "\u690D\u97A3\u9769\u540D\u7247\u5939",
    description: "\u7B80\u7EA6\u8BBE\u8BA1\u7684\u690D\u97A3\u9769\u540D\u7247\u5939\uFF0C\u53EF\u5BB9\u7EB3\u7EA620\u5F20\u540D\u7247\u3002\u5C0F\u5DE7\u8F7B\u8584\uFF0C\u653E\u5165\u53E3\u888B\u6BEB\u65E0\u8D1F\u62C5\uFF0C\u662F\u5546\u52A1\u4EBA\u58EB\u7684\u7406\u60F3\u4E4B\u9009\u3002",
    imageUrl: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&h=400&fit=crop",
    tags: ["\u690D\u97A3\u9769", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "w005",
    title: "\u7F16\u7EC7\u624B\u73AF\u4E09\u4EF6\u5957",
    description: "\u4E09\u79CD\u4E0D\u540C\u7F16\u7EC7\u6280\u6CD5\u7EC4\u5408\u7684\u624B\u73AF\u5957\u88C5\uFF0C\u642D\u914D\u7EAF\u94DC\u642D\u6263\u3002\u53EF\u5355\u72EC\u4F69\u6234\u6216\u7EC4\u5408\u642D\u914D\uFF0C\u5F70\u663E\u4E2A\u6027\u3002",
    imageUrl: "https://images.unsplash.com/photo-1573408301185-954f80942964?w=600&h=400&fit=crop",
    tags: ["\u7F16\u7EC7", "\u690D\u97A3\u9769", "\u539F\u8272"]
  },
  {
    id: "w006",
    title: "\u94EC\u97A3\u9769\u5361\u5305",
    description: "\u6781\u7B80\u98CE\u683C\u7684\u94EC\u97A3\u9769\u5361\u5305\uFF0C\u4EC54\u4E2A\u5361\u4F4D\u8BBE\u8BA1\u3002\u76AE\u9769\u89E6\u611F\u7EC6\u817B\uFF0C\u65E5\u5E38\u4F7F\u7528\u7684\u5B8C\u7F8E\u5355\u54C1\u3002",
    imageUrl: "https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600&h=400&fit=crop",
    tags: ["\u94EC\u97A3\u9769", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  }
];
var materialPacks = [
  {
    id: "m001",
    name: "\u5165\u95E8\u690D\u97A3\u9769\u77ED\u5939\u6750\u6599\u5305",
    price: 128,
    components: [
      "\u610F\u5927\u5229\u690D\u97A3\u9769\u88C1\u7247 2\u7247",
      "\u624B\u7F1D\u8721\u7EBF 1\u5377",
      "\u83F1\u65A9 1\u628A",
      "\u7F1D\u9488 2\u679A",
      "\u5C01\u8FB9\u6DB2 1\u74F6",
      "\u7802\u7EB8 2\u5F20",
      "\u56FE\u6587\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u690D\u97A3\u9769", "\u539F\u8272", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "m002",
    name: "\u8FDB\u9636\u7F16\u7EC7\u6280\u6CD5\u5957\u88C5",
    price: 268,
    components: [
      "\u6CD5\u56FD\u5C0F\u7F8A\u76AE\u6761 6\u6761",
      "\u7F16\u7EC7\u8F85\u52A9\u5DE5\u5177 1\u5957",
      "\u624B\u7F1D\u8721\u7EBF 2\u5377",
      "\u7EAF\u94DC\u642D\u6263 3\u679A",
      "\u76AE\u9769\u80F6\u6C34 1\u652F",
      "\u89C6\u9891\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u7F16\u7EC7", "\u690D\u97A3\u9769", "\u624B\u5DE5\u7F1D\u7EBF"]
  },
  {
    id: "m003",
    name: "\u5341\u5B57\u7EB9\u957F\u5939\u4E13\u4E1A\u5305",
    price: 198,
    components: [
      "\u5341\u5B57\u7EB9\u725B\u76AE\u88C1\u7247 8\u7247",
      "\u5185\u91CC\u7F8A\u76AE 2\u7247",
      "YKK\u62C9\u94FE 1\u6761",
      "\u624B\u7F1D\u8721\u7EBF 3\u5377",
      "\u83F1\u65A9\u5957\u88C5 1\u5957",
      "\u5C01\u8FB9\u5DE5\u5177 1\u5957"
    ],
    tagList: ["\u5341\u5B57\u7EB9", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "m004",
    name: "\u94EC\u97A3\u9769\u6258\u7279\u5927\u5305\u6750\u6599",
    price: 388,
    components: [
      "\u6CD5\u56FD\u94EC\u97A3\u9769\u5927\u7247 2\u5F20",
      "\u5305\u5E26\u76AE\u9769 2\u6761",
      "\u4E94\u91D1\u914D\u4EF6 1\u5957",
      "\u624B\u7F1D\u8721\u7EBF 3\u5377",
      "\u5927\u53F7\u83F1\u65A9 1\u628A",
      "\u8BE6\u7EC6\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u94EC\u97A3\u9769", "\u7F16\u7EC7", "\u5C01\u8FB9", "\u624B\u5DE5\u7F1D\u7EBF"]
  },
  {
    id: "m005",
    name: "\u540D\u7247\u5939\u7B80\u6613\u6750\u6599\u5305",
    price: 68,
    components: [
      "\u690D\u97A3\u9769\u88C1\u7247 2\u7247",
      "\u624B\u7F1D\u8721\u7EBF 1\u5377",
      "\u8FF7\u4F60\u83F1\u65A9 1\u628A",
      "\u7F1D\u9488 2\u679A",
      "\u57FA\u7840\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u690D\u97A3\u9769", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "m006",
    name: "\u5C01\u8FB9\u5904\u7406\u5DE5\u5177\u5957\u88C5",
    price: 88,
    components: [
      "\u5C01\u8FB9\u6DB2 2\u74F6",
      "\u7802\u7EB8\u677F 1\u5757",
      "\u629B\u5149\u68D2 1\u6839",
      "\u78E8\u8FB9\u80F6\u7247 3\u5F20",
      "\u4F7F\u7528\u8BF4\u660E 1\u4EFD"
    ],
    tagList: ["\u5C01\u8FB9"]
  },
  {
    id: "m007",
    name: "\u94EC\u97A3\u9769\u5361\u5305\u4F53\u9A8C\u88C5",
    price: 88,
    components: [
      "\u94EC\u97A3\u9769\u88C1\u7247 4\u7247",
      "\u624B\u7F1D\u8721\u7EBF 1\u5377",
      "\u83F1\u65A9 1\u628A",
      "\u7F1D\u9488 2\u679A",
      "\u56FE\u6587\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u94EC\u97A3\u9769", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "m008",
    name: "\u539F\u8272\u690D\u97A3\u9769\u65B0\u624B\u793C\u5305",
    price: 168,
    components: [
      "\u539F\u8272\u690D\u97A3\u9769\u7EC3\u624B\u76AE 3\u5757",
      "\u5168\u5957\u57FA\u7840\u5DE5\u5177 1\u5957",
      "\u624B\u7F1D\u8721\u7EBF 2\u5377",
      "\u591A\u79CD\u89C4\u683C\u83F1\u65A9 1\u5957",
      "\u65B0\u624B\u5165\u95E8\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u690D\u97A3\u9769", "\u539F\u8272", "\u624B\u5DE5\u7F1D\u7EBF", "\u5C01\u8FB9"]
  },
  {
    id: "m009",
    name: "\u7F16\u7EC7\u624B\u73AFDIY\u5957\u88C5",
    price: 58,
    components: [
      "\u690D\u97A3\u9769\u76AE\u6761 3\u6761",
      "\u7EAF\u94DC\u642D\u6263 3\u679A",
      "\u8F85\u52A9\u80F6\u6C34 1\u652F",
      "\u56FE\u6587\u6559\u7A0B 1\u4EFD"
    ],
    tagList: ["\u7F16\u7EC7", "\u690D\u97A3\u9769", "\u539F\u8272"]
  },
  {
    id: "m010",
    name: "\u624B\u5DE5\u7F1D\u7EBF\u5DE5\u5177\u5927\u5168",
    price: 158,
    components: [
      "\u8FDB\u53E3\u624B\u7F1D\u9488 10\u679A",
      "\u624B\u7F1D\u8721\u7EBF 5\u8272\u54041\u5377",
      "\u83F1\u65A9 3\u628A",
      "\u6CD5\u65A9 2\u628A",
      "\u7EBF\u526A 1\u628A"
    ],
    tagList: ["\u624B\u5DE5\u7F1D\u7EBF"]
  }
];
var orders = [
  {
    id: uuidv4(),
    materialPackId: "m001",
    materialPackName: "\u5165\u95E8\u690D\u97A3\u9769\u77ED\u5939\u6750\u6599\u5305",
    quantity: 1,
    totalPrice: 128,
    status: "\u5DF2\u53D1\u8D27",
    customerName: "\u5F20\u4E09",
    customerPhone: "138****1234",
    createdAt: "2026-06-15T10:30:00Z"
  },
  {
    id: uuidv4(),
    materialPackId: "m003",
    materialPackName: "\u5341\u5B57\u7EB9\u957F\u5939\u4E13\u4E1A\u5305",
    quantity: 2,
    totalPrice: 396,
    status: "\u5DF2\u5B8C\u6210",
    customerName: "\u674E\u56DB",
    customerPhone: "139****5678",
    createdAt: "2026-06-10T14:20:00Z"
  }
];

// src/backend/server.ts
var app = express();
var PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.get("/works", (_req, res) => {
  res.json(works);
});
app.get("/works/:id", (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: "\u4F5C\u54C1\u4E0D\u5B58\u5728" });
    return;
  }
  res.json(work);
});
app.get("/materials", (_req, res) => {
  res.json(materialPacks);
});
app.get("/materials/:id", (req, res) => {
  const pack = materialPacks.find((m) => m.id === req.params.id);
  if (!pack) {
    res.status(404).json({ error: "\u6750\u6599\u5305\u4E0D\u5B58\u5728" });
    return;
  }
  res.json(pack);
});
app.get("/orders", (_req, res) => {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});
app.post("/orders", (req, res) => {
  const { materialPackId, quantity, customerName, customerPhone } = req.body;
  if (!materialPackId || !quantity || !customerName || !customerPhone) {
    res.status(400).json({ error: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5" });
    return;
  }
  const pack = materialPacks.find((m) => m.id === materialPackId);
  if (!pack) {
    res.status(404).json({ error: "\u6750\u6599\u5305\u4E0D\u5B58\u5728" });
    return;
  }
  const newOrder = {
    id: uuidv42(),
    materialPackId,
    materialPackName: pack.name,
    quantity: Number(quantity),
    totalPrice: pack.price * Number(quantity),
    status: "\u5DF2\u63D0\u4EA4",
    customerName,
    customerPhone,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  app.listen(PORT, () => {
    console.log(`\u540E\u7AEF API \u670D\u52A1\u5668\u8FD0\u884C\u5728 http://localhost:${PORT}`);
  });
}
var server_default = app;
export {
  server_default as default
};
