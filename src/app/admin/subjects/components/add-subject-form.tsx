'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy } from 'lucide-react';
import type { Subject } from '@/lib/types';

const schoolYearRegex = /^\d{4}-\d{4}$/;

const scheduleSchema = z.object({
  day: z.string(),
  startTime: z.string().min(1, { message: 'Required' }),
  endTime: z.string().min(1, { message: 'Required' }),
  room: z.string().min(1, { message: 'Required' }),
});

const subjectSchema = z.object({
  name: z.string().min(2, { message: 'Subject name must be at least 2 characters.' }),
  code: z.string().min(2, { message: 'Subject code is required.' }),
  description: z.string().optional(),
  schoolYear: z.string().regex(schoolYearRegex, { message: 'Invalid format. Use YYYY-YYYY.' }),
  yearLevel: z.string({ required_error: 'Please select a year level.' }),
  block: z.string().min(1, { message: 'Block name is required.' }),
  schedules: z.array(scheduleSchema).min(1, { message: 'At least one schedule is required.' })
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface AddSubjectFormProps {
  onSuccess: () => void;
  subject?: Subject | null;
}

export function AddSubjectForm({ onSuccess, subject }: AddSubjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isEditMode = !!subject;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: isEditMode ? {
        ...subject,
        schoolYear: subject.schoolYear,
        yearLevel: subject.yearLevel,
    } : {
      schedules: [],
      schoolYear: '',
      yearLevel: '',
      name: '',
      code: '',
      description: '',
      block: '',
    },
  });
  
  useEffect(() => {
    if (isEditMode) {
      form.reset({
        ...subject,
        schoolYear: subject.schoolYear,
        yearLevel: subject.yearLevel,
      });
    } else {
        form.reset({
            schedules: [],
            schoolYear: '',
            yearLevel: '',
            name: '',
            code: '',
            description: '',
            block: '',
        })
    }
  }, [subject, form, isEditMode]);


  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'schedules',
  });

  const handleDayCheckedChange = (checked: boolean, day: string) => {
    const fieldIndex = fields.findIndex(field => field.day === day);
    if (checked && fieldIndex === -1) {
      append({ day, startTime: '', endTime: '', room: '' });
    } else if (!checked && fieldIndex > -1) {
      remove(fieldIndex);
    }
  };

  const handleCopySchedule = (targetIndex: number) => {
    const currentDay = fields[targetIndex].day;
    const currentDayOrder = daysOfWeek.indexOf(currentDay);
    
    let sourceIndex = -1;
    // Find the index of the previous checked day by iterating backwards
    for (let i = currentDayOrder - 1; i >= 0; i--) {
        const prevDay = daysOfWeek[i];
        const foundIndex = fields.findIndex(field => field.day === prevDay);
        if (foundIndex > -1) {
            sourceIndex = foundIndex;
            break;
        }
    }

    if (sourceIndex === -1) {
      toast({
        variant: 'destructive',
        title: 'Cannot Copy',
        description: 'There is no previous checked day to copy from.',
      });
      return;
    }
  
    const sourceSchedule = form.getValues(`schedules.${sourceIndex}`);
    if (!sourceSchedule) return;
  
    const { startTime, endTime, room } = sourceSchedule;
  
    // Use `update` from useFieldArray to set values for a specific index
    update(targetIndex, { ...fields[targetIndex], startTime, endTime, room });


    toast({
      title: 'Schedule Copied',
      description: `Schedule from ${sourceSchedule.day} has been copied to ${currentDay}.`,
    });
  };

  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && subject?.id) {
        const subjectRef = doc(firestore, 'subjects', subject.id);
        await setDoc(subjectRef, values, { merge: true });
        toast({
          title: 'Subject Updated',
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        await addDoc(collection(firestore, 'subjects'), values);
        toast({
          title: 'Subject Created',
          description: `${values.name} has been added successfully.`,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'create'} subject. Please try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
            name="schoolYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Year</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2024-2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="yearLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a year level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="block"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Block</FormLabel>
                 <FormControl>
                  <Input placeholder="e.g., BSIT-3A" {...field} />
                </FormControl>
                <FormDescription>
                    Enter the block or section name for this subject.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <div>
          <FormLabel>Schedule</FormLabel>
          <FormDescription className="mb-2">Select the days this subject is scheduled and fill in the details.</FormDescription>
          <div className="space-y-4">
            {daysOfWeek.map((day) => {
              const fieldIndex = fields.findIndex(f => f.day === day);
              const isChecked = fieldIndex > -1;
              return (
                <div key={day}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleDayCheckedChange(Boolean(checked), day)}
                    />
                    <label htmlFor={day} className="text-sm font-medium leading-none">
                      {day}
                    </label>
                  </div>
                  {isChecked && (
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 pl-6 items-center">
                      <FormField
                        control={form.control}
                        name={`schedules.${fieldIndex}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`schedules.${fieldIndex}.endTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`schedules.${fieldIndex}.room`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Room" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCopySchedule(fieldIndex)}
                        aria-label="Copy schedule from previous checked day"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
             <FormField
                control={form.control}
                name="schedules"
                render={() => (
                    <FormItem>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Subject' : 'Create Subject')}
        </Button>
      </form>
    </Form>
  );
}
