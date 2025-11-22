'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SchoolYear, YearLevel, Block } from '@/lib/types';

const subjectSchema = z.object({
  name: z.string().min(2, { message: 'Subject name must be at least 2 characters.' }),
  code: z.string().min(2, { message: 'Subject code is required.' }),
  description: z.string().optional(),
  schoolYearId: z.string({ required_error: 'Please select a school year.' }),
  yearLevelId: z.string({ required_error: 'Please select a year level.' }),
  blockId: z.string({ required_error: 'Please select a block.' }),
  scheduleDay: z.string().min(1, {message: 'Day is required.'}),
  scheduleStartTime: z.string().min(1, {message: 'Start time is required.'}),
  scheduleEndTime: z.string().min(1, {message: 'End time is required.'}),
  scheduleRoom: z.string().min(1, {message: 'Room is required.'}),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface AddSubjectFormProps {
  onSuccess: () => void;
}

export function AddSubjectForm({ onSuccess }: AddSubjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
  });

  const { data: schoolYears, isLoading: schoolYearsLoading } = useCollection<SchoolYear>(
    useMemoFirebase(() => collection(firestore, 'schoolYears'), [firestore])
  );
  const { data: yearLevels, isLoading: yearLevelsLoading } = useCollection<YearLevel>(
    useMemoFirebase(() => collection(firestore, 'yearLevels'), [firestore])
  );
  
  const selectedYearLevelId = form.watch('yearLevelId');

  const blocksQuery = useMemoFirebase(() => {
    if (!selectedYearLevelId) return null;
    return collection(firestore, 'yearLevels', selectedYearLevelId, 'blocks');
  }, [firestore, selectedYearLevelId]);
  const { data: blocks, isLoading: blocksLoading } = useCollection<Block>(blocksQuery);


  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'subjects'), {
        name: values.name,
        code: values.code,
        description: values.description,
        schoolYearId: values.schoolYearId,
        yearLevelId: values.yearLevelId,
        blockId: values.blockId,
        schedule: {
          day: values.scheduleDay,
          startTime: values.scheduleStartTime,
          endTime: values.scheduleEndTime,
          room: values.scheduleRoom,
        },
        // Hardcoding semesterId for now as it's not in the form
        semesterId: 'sem01',
      });
      toast({
        title: 'Subject Created',
        description: `${values.name} has been added successfully.`,
      });
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create subject. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = schoolYearsLoading || yearLevelsLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Introduction to Programming" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CS101" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the subject." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="schoolYearId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>School Year</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a school year" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {schoolYears?.map((sy) => (
                            <SelectItem key={sy.id} value={sy.id}>{sy.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="yearLevelId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Year Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a year level" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {yearLevels?.map((yl) => (
                            <SelectItem key={yl.id} value={yl.id}>{yl.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="blockId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Block</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedYearLevelId || blocksLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a year level first" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {blocks?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        <div>
            <FormLabel>Schedule</FormLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                 <FormField
                    control={form.control}
                    name="scheduleDay"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="Day" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="scheduleStartTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="time" placeholder="Start Time" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="scheduleEndTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="time" placeholder="End Time" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="scheduleRoom"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="Room" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
        </div>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? 'Creating...' : 'Create Subject'}
        </Button>
      </form>
    </Form>
  );
}
