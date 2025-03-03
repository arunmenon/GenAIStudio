import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { type NodeType } from "@shared/types";

interface NodeConfigProps {
  nodeId: string;
  nodeType: NodeType;
  config: Record<string, any>;
  onConfigChange: (nodeId: string, config: Record<string, any>) => void;
  onNextStep?: () => void;
}

// Configuration schemas for different node types
const scheduleConfigSchema = z.object({
  schedule: z.string().min(1, "Schedule is required"),
  timezone: z.string().default("UTC"),
});

const llmChainConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().int().min(1).max(4000).default(1000),
});

const codeConfigSchema = z.object({
  language: z.enum(["javascript", "python"]),
  mode: z.enum(["Run Once", "Run Once for All Items", "Run for Each Item"]),
  code: z.string().min(1, "Code is required"),
});

export default function NodeConfig({ nodeId, nodeType, config, onConfigChange, onNextStep }: NodeConfigProps) {
  const form = useForm({
    resolver: zodResolver(getSchemaForType(nodeType)),
    defaultValues: {
      ...config,
      language: config.language || "javascript",
      mode: config.mode || "Run Once",
    },
  });

  useEffect(() => {
    form.reset(config);
  }, [config, form]);

  const onSubmit = (data: Record<string, any>) => {
    onConfigChange(nodeId, data);
  };

  // Select schema based on node type
  const getSchemaForType = (type: NodeType) => {
    switch (type) {
      case "schedule_trigger":
        return scheduleConfigSchema;
      case "basic_llm_chain":
        return llmChainConfigSchema;
      case "code":
        return codeConfigSchema;
      default:
        return z.object({});
    }
  };

  const renderScheduleTrigger = () => (
    <>
      <FormField
        control={form.control}
        name="schedule"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Schedule (Cron Expression)</FormLabel>
            <FormControl>
              <Input placeholder="*/5 * * * *" {...field} />
            </FormControl>
            <FormDescription>
              Enter a cron expression (e.g. "*/5 * * * *" for every 5 minutes)
            </FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </>
  );

  const renderCodeNode = () => (
    <>
      <FormField
        control={form.control}
        name="mode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mode</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Run Once">Run Once</SelectItem>
                <SelectItem value="Run Once for All Items">Run Once for All Items</SelectItem>
                <SelectItem value="Run for Each Item">Run for Each Item</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Language</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python (Beta)</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Textarea
                className="font-mono h-48"
                placeholder={`Type $ for a list of special vars/methods.\nDebug by using console.log() statements.`}
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );

  const renderFields = () => {
    switch (nodeType) {
      case "schedule_trigger":
        return renderScheduleTrigger();
      case "code":
        return renderCodeNode();
      case "basic_llm_chain":
        return (
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter your prompt..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-96">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Node Configuration</CardTitle>
        {onNextStep && (
          <Button variant="ghost" size="sm" onClick={onNextStep}>
            Next Step <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {renderFields()}
            <Button type="submit" className="w-full">Save Configuration</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}