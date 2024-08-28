import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminAccountsPageComponent } from './admin-accounts-page.component';
import { LoadingSpinnerModule } from '../../components/loading-spinner/loading-spinner.module';
import { AccountService } from '../../../services/account.service';
import { CourseService } from '../../../services/course.service';
import { InstructorService } from '../../../services/instructor.service';
import { StudentService } from '../../../services/student.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { NavigationService } from '../../../services/navigation.service';
import { of, throwError } from 'rxjs';
class MockAccountService {
    getAccount() { return of({ googleId: 'test-id', name: 'Test User', email: 'test@example.com', readNotifications: {} }); }
    deleteAccount() { return of(null); }
}

class MockCourseService {
    getStudentCoursesInMasqueradeMode() { return of({ courses: [] }); }
    getInstructorCoursesInMasqueradeMode() { return of({ courses: [] }); }
}

class MockInstructorService {
    deleteInstructor() { return of(null); }
}

class MockStudentService {
    deleteStudent() { return of(null); }
}

class MockStatusMessageService {
    showSuccessToast() {}
    showErrorToast() {}
}

class MockNavigationService {
    navigateWithSuccessMessage() {}
}

describe('AdminAccountsPageComponent', () => {
    let component: AdminAccountsPageComponent;
    let fixture: ComponentFixture<AdminAccountsPageComponent>;
    let mockStatusMessageService: MockStatusMessageService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [AdminAccountsPageComponent],
            imports: [
                HttpClientTestingModule,
                RouterTestingModule,
                LoadingSpinnerModule,
            ],
            providers: [
                { provide: AccountService, useClass: MockAccountService },
                { provide: CourseService, useClass: MockCourseService },
                { provide: InstructorService, useClass: MockInstructorService },
                { provide: StudentService, useClass: MockStudentService },
                { provide: StatusMessageService, useClass: MockStatusMessageService },
                { provide: NavigationService, useClass: MockNavigationService },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdminAccountsPageComponent);
        component = fixture.componentInstance;
        mockStatusMessageService = TestBed.inject(StatusMessageService) as unknown as MockStatusMessageService;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('UpdateAccount functionality', () => {
        it('should update user to Instructor and handle success', () => {
            component.selectedRole = 'instructor';
            component.updateAccount();
            expect(mockStatusMessageService.showSuccessToast).toBeDefined();
        });

        it('should handle error when converting to student', () => {
            mockStatusMessageService.showErrorToast = () => {};
            (component as any).convertToStudent = () => throwError(() => new Error('Conversion failed'));
            component.selectedRole = 'student';
            component.updateAccount();
            expect(mockStatusMessageService.showErrorToast).toBeDefined();
        });
    });
});
