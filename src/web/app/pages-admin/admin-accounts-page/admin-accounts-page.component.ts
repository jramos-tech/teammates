import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, tap } from 'rxjs/operators';
import { AccountService } from '../../../services/account.service';
import { CourseService } from '../../../services/course.service';
import { InstructorService } from '../../../services/instructor.service';
import { NavigationService } from '../../../services/navigation.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { StudentService } from '../../../services/student.service';
import { Account, Course, Courses } from '../../../types/api-output';
import { ErrorMessageOutput } from '../../error-message-output';
import { forkJoin, Observable, throwError } from 'rxjs';

@Component({
  selector: 'tm-admin-accounts-page',
  templateUrl: './admin-accounts-page.component.html',
  styleUrls: ['./admin-accounts-page.component.scss'],
})
export class AdminAccountsPageComponent implements OnInit {

  instructorCourses: Course[] = [];
  studentCourses: Course[] = [];
  accountInfo: Account = {
    googleId: '',
    name: '',
    email: '',
    readNotifications: {},
  };

  isLoadingAccountInfo: boolean = false;
  isLoadingStudentCourses: boolean = false;
  isLoadingInstructorCourses: boolean = false;
  isUpdatingAccountRole: boolean = false;
  selectedRole: string = 'student';

  constructor(private route: ActivatedRoute,
              private instructorService: InstructorService,
              private studentService: StudentService,
              private navigationService: NavigationService,
              private statusMessageService: StatusMessageService,
              private accountService: AccountService,
              private courseService: CourseService) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams: any) => {
      this.loadAccountInfo(queryParams.instructorid);
    });
  }

  loadAccountInfo(instructorid: string): void {
    this.isLoadingAccountInfo = true;
    this.accountService.getAccount(instructorid)
        .pipe(finalize(() => {
          this.isLoadingAccountInfo = false;
        }))
        .subscribe({
          next: (resp: Account) => {
            this.accountInfo = resp;
          },
          error: (resp: ErrorMessageOutput) => {
            this.statusMessageService.showErrorToast(resp.error.message);
          },
        });

    this.isLoadingStudentCourses = true;
    this.courseService.getStudentCoursesInMasqueradeMode(instructorid)
        .pipe(finalize(() => {
          this.isLoadingStudentCourses = false;
        }))
        .subscribe({
          next: (resp: Courses) => {
            this.studentCourses = resp.courses;
          },
          error: (resp: ErrorMessageOutput) => {
            if (resp.status !== 403) {
              this.statusMessageService.showErrorToast(resp.error.message);
            }
          },
        });

    this.isLoadingInstructorCourses = true;
    this.courseService.getInstructorCoursesInMasqueradeMode(instructorid)
        .pipe(finalize(() => {
          this.isLoadingInstructorCourses = false;
        }))
        .subscribe({
          next: (resp: Courses) => {
            this.instructorCourses = resp.courses;
          },
          error: (resp: ErrorMessageOutput) => {
            if (resp.status !== 403) {
              this.statusMessageService.showErrorToast(resp.error.message);
            }
          },
        });
  }

  deleteAccount(): void {
    const id: string = this.accountInfo.googleId;
    this.accountService.deleteAccount(id).subscribe({
      next: () => {
        this.navigationService.navigateWithSuccessMessage('/web/admin/search',
            `Account "${id}" is successfully deleted.`);
      },
      error: (resp: ErrorMessageOutput) => {
        this.statusMessageService.showErrorToast(resp.error.message);
      },
    });
  }

  updateAccount(): void {
    const id: string = this.accountInfo.googleId;
    const isStudentRole = this.selectedRole === 'student';

    if (isStudentRole) {
      this.convertToStudent(id);
    } else {
      this.convertToInstructor(id);
    }
  }

  convertToStudent(id: string): void {
    const removeInstructorObservables = this.instructorCourses.map(course =>
        this.removeInstructorFromCourse(course.courseId)
    );

    forkJoin(removeInstructorObservables).pipe(
        finalize(() => this.loadAccountInfo(id))
    ).subscribe({
      next: () => {
        this.statusMessageService.showSuccessToast(`Account "${id}" successfully updated to Student`);
      },
      error: (error) => {
        this.statusMessageService.showErrorToast("Error converting to student role: " + error.message);
      }
    });
  }

  convertToInstructor(id: string): void {
    const removeStudentObservables = this.studentCourses.map(course =>
        this.removeStudentFromCourse(course.courseId)
    );

    forkJoin(removeStudentObservables).pipe(
        finalize(() => this.loadAccountInfo(id))
    ).subscribe({
      next: () => {
        this.statusMessageService.showSuccessToast(`Account "${id}" successfully updated to Instructor`);
      },
      error: (error) => {
        this.statusMessageService.showErrorToast("Error converting to instructor role: " + error.message);
      }
    });
  }


  removeStudentFromCourse(courseId: string): Observable<void> {
    return this.studentService.deleteStudent({
      courseId,
      googleId: this.accountInfo.googleId,
    }).pipe(
        tap(() => {
          this.studentCourses = this.studentCourses.filter((course: Course) => course.courseId !== courseId);
          this.statusMessageService.showSuccessToast(`Student is successfully deleted from course "${courseId}"`);
        }),
        catchError((resp: ErrorMessageOutput) => {
          this.statusMessageService.showErrorToast(resp.error.message);
          return throwError(() => new Error(resp.error.message));
        })
    );
  }

  removeInstructorFromCourse(courseId: string): Observable<void> {
    return this.instructorService.deleteInstructor({
      courseId,
      instructorId: this.accountInfo.googleId,
    }).pipe(
        tap(() => {
          this.instructorCourses = this.instructorCourses.filter((course: Course) => course.courseId !== courseId);
          this.statusMessageService.showSuccessToast(`Instructor is successfully deleted from course "${courseId}"`);
        }),
        catchError((resp: ErrorMessageOutput) => {
          this.statusMessageService.showErrorToast(resp.error.message);
          return throwError(() => new Error(resp.error.message));
        })
    );
  }
  noOp(): Observable<void> {
    return new Observable<void>(observer => {
      observer.complete();
    });
  }
}
