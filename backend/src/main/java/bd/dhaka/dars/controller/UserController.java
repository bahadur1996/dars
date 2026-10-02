package bd.dhaka.dars.controller;

import bd.dhaka.dars.dto.PageResponse;
import bd.dhaka.dars.dto.UserDtos.CreateUserRequest;
import bd.dhaka.dars.dto.UserDtos.UpdateUserRequest;
import bd.dhaka.dars.dto.UserDtos.UserResponse;
import bd.dhaka.dars.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Officer management. Restricted to ADMIN in SecurityConfig. */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<UserResponse> list(@PageableDefault(size = 20, sort = "username") Pageable pageable) {
        return PageResponse.of(service.list(pageable), UserResponse::from);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
        return UserResponse.from(service.create(req));
    }

    @PatchMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req) {
        return UserResponse.from(service.update(id, req));
    }
}
