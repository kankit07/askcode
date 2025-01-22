"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import AskQuestionCard from "../dashboard/ask-question-card";
import React, { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import CodeReferences from "../dashboard/code-references";
import Image from "next/image";

const QAPage = () => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const question = questions ? questions[questionIndex] : undefined;
  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4" />
      <h1 className="text-xl font-semibold"> Saved Questions </h1>
      <div className="h-2" />
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <React.Fragment key={question.id}>
              <SheetTrigger onClick={() => setQuestionIndex(index)}>
                <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow">
                  {/* <img
                    className="rounded-full"
                    height={30}
                    width={30}
                    src={question.user.image}
                    alt="user-image"
                  /> */}
                  <Image
                    src={question?.user?.image ?? "/default-avatar.png"}
                    height={32}
                    width={32}
                    alt="user-image"
                    className="rounded-full"
                  />
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-1 text-lg font-medium text-gray-700">
                        {question.question}
                      </p>
                      <span className="whitespace-nowrap text-xs text-gray-400">
                        {question.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      {question.answer}
                    </p>
                  </div>
                </div>
              </SheetTrigger>
            </React.Fragment>
          );
        })}
      </div>
      {question && (
        <SheetContent className="overflow-scroll sm:max-w-[80vw]">
          <SheetHeader>
            <SheetTitle>{question.question}</SheetTitle>
            <div
              data-color-mode="light"
              className="max-h-[40ch] overflow-scroll rounded-md border border-gray-200"
            >
              <MDEditor.Markdown source={question.answer} className="p-4" />
            </div>
            {/* <MDEditor.Markdown source={question.answer} className="p-4" /> */}
            <CodeReferences
              fileReferences={(question.fileReferences ?? []) as any}
            />
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};
export default QAPage;
