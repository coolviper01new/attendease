'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { addDoc, collection, doc, setDoc, writeBatch, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, PlusCircle, Trash2 } from 'lucide-react';
import type { Subject, Registration } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

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
  blockCount: z.coerce.number().min(1, { message: 'At least one block is required.' }),
  credits: z.coerce.number().min(1, { message: 'Credit units are required.'}),
  hasLab: z.boolean(),
  lectureSchedules: z.array(scheduleSchema).min(1, { message: 'At least one lecture schedule is required.' }),
  labSchedules: z.array(scheduleSchema).optional(),
  enrollmentStatus: z.enum(['closed', 'open']),
}).refine(data => {
    if (data.hasLab) {
        return data.labSchedules && data.labSchedules.length > 0;
    }
    return true;
}, {
    message: "At least one laboratory schedule is required when 'Has Lab' is enabled.",
    path: ['labSchedules']
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AddSubjectFormProps {
  onSuccess: () => void;
  subject?: Subject | null;
  allSubjects: Subject[];
}

const ScheduleArray = ({ control, name, label, description, isLab = false }: { control: any, name: "lectureSchedules" | "labSchedules", label: string, description: string, isLab?: boolean }) => {
    const { fields, append, remove, update } = useFieldArray({ control, name });

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
      
        const sourceSchedule = control.getValues(`${name}.${sourceIndex}`);
        if (!sourceSchedule) return;
      
        const { startTime, endTime, room } = sourceSchedule;
      
        update(targetIndex, { ...fields[targetIndex], startTime, endTime, room });

        toast({
          title: 'Schedule Copied',
          description: `Schedule from ${sourceSchedule.day} has been copied to ${currentDay}.`,
        });
    };

    return (
        <div className="space-y-4 rounded-md border p-4">
          <FormLabel>{label}</FormLabel>
          <FormDescription className="!mt-0 mb-2">{description}</FormDescription>
          <div className="space-y-4">
            {daysOfWeek.map((day) => {
              const fieldIndex = fields.findIndex(f => f.day === day);
              const isChecked = fieldIndex > -1;
              return (
                <div key={day}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${name}-${day}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleDayCheckedChange(Boolean(checked), day)}
                    />
                    <label htmlFor={`${name}-${day}`} className="text-sm font-medium leading-none">
                      {day}
                    </label>
                  </div>
                  {isChecked && (
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 pl-6 items-center">
                       <FormField
                        control={control}
                        name={`${name}.${fieldIndex}.startTime` as const}
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
                        control={control}
                        name={`${name}.${fieldIndex}.endTime` as const}
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
                        control={control}
                        name={`${name}.${fieldIndex}.room` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Room"
                                {...field}
                                onBlur={(e) => {
                                  field.onBlur();
                                  control.setValue(`${name}.${fieldIndex}.room`, e.target.value.toUpperCase());
                                }}
                              />
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
                control={control}
                name={name}
                render={() => (
                    <FormItem>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </div>
    )
}


export function AddSubjectForm({ onSuccess, subject, allSubjects }: AddSubjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isEditMode = !!subject;

  const isEnrollmentOpen = isEditMode && subject.enrollmentStatus === 'open';

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      lectureSchedules: [],
      labSchedules: [],
      schoolYear: '',
      yearLevel: '',
      name: '',
      code: '',
      description: '',
      blockCount: 1,
      credits: 3,
      hasLab: false,
      enrollmentStatus: 'closed',
    },
  });
  
  useEffect(() => {
    if (isEditMode && subject) {
      const relatedBlocks = allSubjects.filter(s => s.code === subject.code);
      form.reset({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        schoolYear: subject.schoolYear,
        yearLevel: subject.yearLevel,
        credits: subject.credits || 3,
        hasLab: subject.hasLab || false,
        lectureSchedules: subject.lectureSchedules,
        labSchedules: subject.labSchedules || [],
        blockCount: relatedBlocks.length,
        enrollmentStatus: subject.enrollmentStatus || 'closed',
      });
    } else {
        form.reset({
            lectureSchedules: [],
            labSchedules: [],
            schoolYear: '',
            yearLevel: '',
            name: '',
            code: '',
            description: '',
            blockCount: 1,
            credits: 3,
            hasLab: false,
            enrollmentStatus: 'closed',
        })
    }
  }, [subject, form, isEditMode, allSubjects]);

  const hasLab = form.watch('hasLab');

  const onSubmit = async (values: SubjectFormValues) => {
    setIsSubmitting(true);
    try {
        const { blockCount, ...subjectData } = values;
        if (!subjectData.hasLab) {
            subjectData.labSchedules = []; // Ensure lab schedules are empty if hasLab is false
        }
        const subjectsRef = collection(firestore, 'subjects');
        const batch = writeBatch(firestore);

        if (isEditMode && subject) {
            const relatedSubjectsQuery = query(subjectsRef, where('code', '==', subject.code));
            const snapshot = await getDocs(relatedSubjectsQuery);
            const existingSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
            const existingBlockCount = existingSubjects.length;
            
            const updatedSharedData: any = {
                name: values.name,
                description: values.description,
                schoolYear: values.schoolYear,
                yearLevel: values.yearLevel,
                credits: values.credits,
                hasLab: values.hasLab,
                lectureSchedules: values.lectureSchedules,
                labSchedules: values.labSchedules || [],
            };

            existingSubjects.forEach(existingSub => {
                batch.update(doc(subjectsRef, existingSub.id), updatedSharedData);
            });

            if (!isEnrollmentOpen) {
                if (blockCount > existingBlockCount) {
                    for (let i = existingBlockCount + 1; i <= blockCount; i++) {
                        const newDocRef = doc(subjectsRef);
                        const blockName = `${values.code}-B${i}`;
                        batch.set(newDocRef, { ...updatedSharedData, code: values.code, block: blockName, enrollmentStatus: 'closed' });
                    }
                } else if (blockCount < existingBlockCount) {
                    const blocksToRemove = existingSubjects.sort((a, b) => b.block.localeCompare(a.block)).slice(0, existingBlockCount - blockCount);
                    
                    let undeletableBlocks: string[] = [];

                    for (const blockToRemove of blocksToRemove) {
                        const registrationsQuery = query(collectionGroup(firestore, 'registrations'), where('subjectId', '==', blockToRemove.id));
                        const registrationsSnapshot = await getDocs(registrationsQuery);

                        if (registrationsSnapshot.empty) {
                            batch.delete(doc(subjectsRef, blockToRemove.id));
                        } else {
                            undeletableBlocks.push(blockToRemove.block);
                        }
                    }
                    
                    if (undeletableBlocks.length > 0) {
                        toast({
                            variant: 'destructive',
                            title: 'Deletion Prevented',
                            description: `Could not delete block(s) ${undeletableBlocks.join(', ')} because students are enrolled.`,
                        });
                    }
                }
            }
            await batch.commit();
            toast({
                title: 'Subjects Synchronized',
                description: `All blocks for ${values.name} have been updated.`,
            });
        } else {
            for (let i = 1; i <= blockCount; i++) {
                const newDocRef = doc(subjectsRef);
                const blockName = `${values.code}-B${i}`;
                batch.set(newDocRef, { ...subjectData, block: blockName, enrollmentStatus: 'closed' });
            }
            await batch.commit();
            toast({
                title: 'Subjects Created',
                description: `${blockCount} block(s) for ${values.name} have been created successfully.`,
            });
        }
        onSuccess();
    } catch (error) {
        console.error('Error saving subject(s):', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to save subjects. Please try again.`,
        });
    } finally {
        setIsSubmitting(false);
    }
};
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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
                        <Input placeholder="e.g., CS101" {...field} disabled={isEditMode} />
                    </FormControl>
                    {isEditMode && <FormDescription>Code cannot be changed after creation.</FormDescription>}
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
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
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="blockCount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Number of Blocks</FormLabel>
                    <FormControl>
                    <Input type="number" min="1" {...field} disabled={isEnrollmentOpen} />
                    </FormControl>
                    <FormDescription>
                        {isEditMode 
                            ? (isEnrollmentOpen ? "Cannot change after enrollment starts." : "Adjust blocks. Empty ones removed.")
                            : "System will create blocks like IT101-B1, etc."
                        }
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Credit Units</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator />

        <div className="space-y-4">
            <ScheduleArray 
                control={form.control}
                name="lectureSchedules"
                label="Lecture Schedule"
                description="Select the days and times for lecture classes."
            />
            <FormField
                control={form.control}
                name="hasLab"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            Has Laboratory
                        </FormLabel>
                        <FormDescription>
                            Enable this if the subject includes a separate lab schedule.
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                    </FormItem>
                )}
            />
            {hasLab && (
                 <ScheduleArray 
                    control={form.control}
                    name="labSchedules"
                    label="Laboratory Schedule"
                    description="Select the days and times for laboratory classes."
                    isLab
                />
            )}
        </div>


        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Subjects' : 'Create Subjects')}
        </Button>
      </form>
    </Form>
  );
}
